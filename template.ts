#!/usr/bin/env node
import { writeFileSync } from "fs";
import "./environment";

let cloudbuildTemplate = `steps:
- name: 'gcr.io/${globalThis.PROJECT_ID}/spanner-schema-update-cli'
  args: ['update', 'db/ddl', '-p', '${globalThis.PROJECT_ID}', '-i', '${globalThis.BALANCED_DB_INSTANCE_ID}', '-d', '${globalThis.DB_NAME}']
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/${globalThis.PROJECT_ID}/hello-world-service:latest', '.']
- name: "gcr.io/cloud-builders/docker"
  args: ['push', 'gcr.io/${globalThis.PROJECT_ID}/hello-world-service:latest']
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['rollout', 'restart', 'deployment', 'hello-world-service-deployment']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${globalThis.PROJECT_ID}'
    - 'CLOUDSDK_COMPUTE_REGION=${globalThis.CLUSTER_REGION}'
options:
  logging: CLOUD_LOGGING_ONLY
`;

let turnupTemplate = `# GCP auth
gcloud auth application-default login

# Create service account
gcloud iam service-accounts create ${globalThis.BUILDER_ACCOUNT}

# Grant cloudbuild and container repo and database permissions to the service account
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member="serviceAccount:${globalThis.BUILDER_ACCOUNT}@${globalThis.PROJECT_ID}.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member="serviceAccount:${globalThis.BUILDER_ACCOUNT}@${globalThis.PROJECT_ID}.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member="serviceAccount:${globalThis.BUILDER_ACCOUNT}@${globalThis.PROJECT_ID}.iam.gserviceaccount.com" --role='roles/spanner.databaseAdmin' --condition=None

# Set k8s cluster
gcloud container clusters get-credentials ${globalThis.CLUSTER_NAME} --location=${globalThis.CLUSTER_REGION}

# Create the service account
kubectl create serviceaccount ${globalThis.SERVICE_ACCOUNT} --namespace default

# Grant database permissions to the service account
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member=principal://iam.googleapis.com/projects/${globalThis.PROJECT_NUMBER}/locations/global/workloadIdentityPools/${globalThis.PROJECT_ID}.svc.id.goog/subject/ns/default/sa/${globalThis.SERVICE_ACCOUNT} --role=roles/spanner.databaseUser --condition=None

# Create Spanner database
gcloud spanner databases create ${globalThis.DB_NAME} --instance=${globalThis.BALANCED_DB_INSTANCE_ID}
`;

let dockerTemplate = `FROM node:20.12.1

WORKDIR /app
COPY . .
RUN npm install
RUN npx tsc

EXPOSE ${globalThis.PORT}
CMD ["node", "main"]
`;

let serviceTemplate = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world-service-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-world-service-pod
  template:
    metadata:
      labels:
        app: hello-world-service-pod
    spec:
      serviceAccountName: ${globalThis.SERVICE_ACCOUNT}
      containers:
      - name: hello-world-service-container
        image: gcr.io/phading-dev/hello-world-service:latest
        ports:
        - containerPort: ${globalThis.PORT}
---
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: hello-world-service-monitoring
spec:
  selector:
    matchLabels:
      app: hello-world-service-pod
  endpoints:
  - port: ${globalThis.PORT}
    path: /metricsz
    interval: 30s
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: hello-world-service-neg-health-check
spec:
  healthCheck:
    port: ${globalThis.PORT}
    type: HTTP
    requestPath: /healthz
---
apiVersion: v1
kind: Service
metadata:
  name: ${globalThis.SERVICE_NAME}
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    beta.cloud.google.com/backend-config: '{"default": "hello-world-service-neg-health-check"}'
spec:
  selector:
    app: hello-world-service-pod
  ports:
    - protocol: TCP
      port: 80
      targetPort: ${globalThis.PORT}
  type: ClusterIP
`;

function main() {
  let suffix = process.argv[2];
  writeFileSync(`cloudbuild_${suffix}.yaml`, cloudbuildTemplate);
  writeFileSync(`turnup_${suffix}.sh`, turnupTemplate);
  writeFileSync(`Dockerfile`, dockerTemplate);
  writeFileSync(`service.yaml`, serviceTemplate);
}

main();
