# GCP auth
gcloud auth application-default login

# Variables
export PROJECT_ID=phading-dev
export PROJECT_NUMBER=178489203789
export REGION=us-central1
export CLUSTER_NAME=phading-cluster
export BUILDER_ACCOUNT=hello-world-service-builder
export SERVICE_ACCOUNT=hello-world-service-account
export BALANCED_DB_INSTANCE_ID=balanced-db-instance
export DB_NAME=hello-world

# Create service account
gcloud iam service-accounts create $BUILDER_ACCOUNT

# Grant cloudbuild and container repo permissions to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$BUILDER_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$BUILDER_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$BUILDER_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/spanner.databaseAdmin' --condition=None

# Set k8s cluster
gcloud container clusters get-credentials $CLUSTER_NAME --location=$REGION

# Create the service account
kubectl create serviceaccount $SERVICE_ACCOUNT --namespace default

# Grant database permissions to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID --member=principal://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$PROJECT_ID.svc.id.goog/subject/ns/default/sa/$SERVICE_ACCOUNT --role=roles/spanner.databaseUser --condition=None

# Create Spanner database
gcloud spanner databases create $DB_NAME --instance=$BALANCED_DB_INSTANCE_ID
