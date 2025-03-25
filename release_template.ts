import { ENV_VARS } from "./env_vars";
import { writeFileSync } from "fs";

let K8S_SERVICE_NAME = "hello-world-service";
let K8S_SERVICE_PORT = 80;

function generate(env: string) {
  let turnupTemplate = `# GCP auth
gcloud auth application-default login

# Create service account
gcloud iam service-accounts create ${ENV_VARS.builderAccount}

# Grant cloudbuild and container repo and database permissions to the service account
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/spanner.databaseAdmin' --condition=None

# Set k8s cluster
gcloud container clusters get-credentials ${ENV_VARS.clusterName} --location=${ENV_VARS.clusterRegion}

# Create the service account
kubectl create serviceaccount ${ENV_VARS.serviceAccount} --namespace default

# Grant database permissions to the service account
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member=principal://iam.googleapis.com/projects/${ENV_VARS.projectNumber}/locations/global/workloadIdentityPools/${ENV_VARS.projectId}.svc.id.goog/subject/ns/default/sa/${ENV_VARS.serviceAccount} --role=roles/spanner.databaseUser --condition=None

# Create Spanner database
gcloud spanner databases create ${ENV_VARS.spannerDatabaseId} --instance=${ENV_VARS.spannerInstanceId}
  `;
  writeFileSync(`${env}/turnup.sh`, turnupTemplate);

  let cloudbuildTemplate = `steps:
- name: 'node:20.12.1'
  entrypoint: 'npm'
  args: ['install']
- name: 'node:20.12.1'
  entrypoint: 'npx'
  args: ['spanage', 'update', 'db/ddl', '-p', '${ENV_VARS.projectId}', '-i', '${ENV_VARS.spannerInstanceId}', '-d', '${ENV_VARS.spannerDatabaseId}']
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/${ENV_VARS.projectId}/${ENV_VARS.releaseServiceName}:latest', '-f', '${env}/Dockerfile', '.']
- name: "gcr.io/cloud-builders/docker"
  args: ['push', 'gcr.io/${ENV_VARS.projectId}/${ENV_VARS.releaseServiceName}:latest']
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['apply', '-f', '${env}/service.yaml']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${ENV_VARS.clusterName}'
    - 'CLOUDSDK_COMPUTE_REGION=${ENV_VARS.clusterRegion}'
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['rollout', 'restart', 'deployment', '${ENV_VARS.releaseServiceName}-deployment']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${ENV_VARS.clusterName}'
    - 'CLOUDSDK_COMPUTE_REGION=${ENV_VARS.clusterRegion}'
options:
  logging: CLOUD_LOGGING_ONLY
  `;
  writeFileSync(`${env}/cloudbuild.yaml`, cloudbuildTemplate);

  let dockerTemplate = `FROM node:20.12.1

WORKDIR /app
COPY . .
RUN npm install
RUN npx tsc

EXPOSE ${ENV_VARS.port}
CMD ["node", "main"]
  `;
  writeFileSync(`${env}/Dockerfile`, dockerTemplate);

  let serviceTemplate = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${ENV_VARS.releaseServiceName}-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${ENV_VARS.releaseServiceName}-pod
  template:
    metadata:
      labels:
        app: ${ENV_VARS.releaseServiceName}-pod
    spec:
      serviceAccountName: ${ENV_VARS.serviceAccount}
      containers:
      - name: ${ENV_VARS.releaseServiceName}-container
        image: gcr.io/phading-dev/${ENV_VARS.releaseServiceName}:latest
        ports:
        - containerPort: ${ENV_VARS.port}
        livenessProbe:
          httpGet:
            path: /healthz
            port: ${ENV_VARS.port}
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readiness
            port: ${ENV_VARS.port}
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: ${ENV_VARS.releaseServiceName}-monitoring
spec:
  selector:
    matchLabels:
      app: ${ENV_VARS.releaseServiceName}-pod
  endpoints:
  - port: ${ENV_VARS.port}
    path: /metricsz
    interval: 30s
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: ${ENV_VARS.releaseServiceName}-neg-health-check
spec:
  healthCheck:
    port: ${ENV_VARS.port}
    type: HTTP
    requestPath: /healthz
---
apiVersion: v1
kind: Service
metadata:
  name: ${K8S_SERVICE_NAME}
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    beta.cloud.google.com/backend-config: '{"default": "${ENV_VARS.releaseServiceName}-neg-health-check"}'
spec:
  selector:
    app: ${ENV_VARS.releaseServiceName}-pod
  ports:
    - protocol: TCP
      port: ${K8S_SERVICE_PORT}
      targetPort: ${ENV_VARS.port}
  type: ClusterIP
---
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: phading-certificate
spec:
  domains:
    - ${ENV_VARS.externalDomain}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: phading-ingress-external
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "${ENV_VARS.clusterExternalIpName}"
    networking.gke.io/managed-certificates: "phading-certificate"
spec:
  rules:
  - http:
      paths:
      - path: /hw
        pathType: Prefix
        backend:
          service:
            name: ${K8S_SERVICE_NAME}
            port:
              number: ${K8S_SERVICE_PORT}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: phading-ingress-internal
  annotations:
    kubernetes.io/ingress.class: "gce-internal"
    kubernetes.io/ingress.regional-static-ip-name: "${ENV_VARS.clusterInternalIpName}"
spec:
  rules:
  - http:
      paths:
      - path: /hw
        pathType: Prefix
        backend:
          service:
            name: ${K8S_SERVICE_NAME}
            port:
              number: ${K8S_SERVICE_PORT}
`;
  writeFileSync(`${env}/service.yaml`, serviceTemplate);
}

import "./dev/env";
generate("dev");
