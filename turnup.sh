# GCP auth
gcloud auth application-default login

# Variables
export PROJECT_ID=phading-dev
export BUILD_ACCOUNT=hello-world-service-builder

# Create service account
gcloud iam service-accounts create $BUILD_ACCOUNT

# Grant permissions to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$BUILD_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$BUILD_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
