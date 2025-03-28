# GCP auth
gcloud auth application-default login

# Create service account
gcloud iam service-accounts create hello-world-service-builder

# Grant cloudbuild and container repo and database permissions to the service account
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:hello-world-service-builder@phading-dev.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:hello-world-service-builder@phading-dev.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:hello-world-service-builder@phading-dev.iam.gserviceaccount.com" --role='roles/spanner.databaseAdmin' --condition=None

# Set k8s cluster
gcloud container clusters get-credentials phading-cluster --location=us-central1

# Create the service account
kubectl create serviceaccount hello-world-service-account --namespace default

# Grant database permissions to the service account
gcloud projects add-iam-policy-binding phading-dev --member=principal://iam.googleapis.com/projects/178489203789/locations/global/workloadIdentityPools/phading-dev.svc.id.goog/subject/ns/default/sa/hello-world-service-account --role=roles/spanner.databaseUser --condition=None

# Create Spanner database
gcloud spanner databases create hello-world-db --instance=balanced-db-instance
  