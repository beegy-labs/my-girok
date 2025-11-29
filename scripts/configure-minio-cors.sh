#!/bin/bash

# Configure MinIO CORS for Resume PDF Export
# This script sets up CORS rules on MinIO bucket to allow html2canvas to capture images

set -e

BUCKET_NAME="${MINIO_BUCKET_NAME:-my-girok-resumes}"
NAMESPACE="${MINIO_NAMESPACE:-storage}"
MINIO_POD=$(kubectl get pods -n "$NAMESPACE" -l app=minio -o jsonpath='{.items[0].metadata.name}')

if [ -z "$MINIO_POD" ]; then
  echo "Error: MinIO pod not found in namespace '$NAMESPACE'"
  echo "Make sure MinIO is deployed with label app.kubernetes.io/name=minio"
  echo "Available pods:"
  kubectl get pods -n "$NAMESPACE"
  exit 1
fi

echo "Found MinIO pod: $MINIO_POD (namespace: $NAMESPACE)"
echo "Configuring CORS for bucket: $BUCKET_NAME"

# Create CORS configuration XML
CORS_CONFIG=$(cat <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
EOF
)

echo "CORS Configuration:"
echo "$CORS_CONFIG"
echo ""

# Create CORS config file directly in MinIO pod (kubectl cp requires tar which may not be available)
echo "Creating CORS configuration in MinIO pod..."
kubectl exec -n "$NAMESPACE" "$MINIO_POD" -- sh -c "cat > /tmp/cors.xml << 'EOFXML'
$CORS_CONFIG
EOFXML
"

# Apply CORS configuration using mc command
echo "Applying CORS configuration..."
kubectl exec -n "$NAMESPACE" "$MINIO_POD" -- sh -c "
  mc alias set myminio http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD &&
  mc cors set /tmp/cors.xml myminio/$BUCKET_NAME
"

# Verify CORS configuration
echo ""
echo "Verifying CORS configuration..."
kubectl exec -n "$NAMESPACE" "$MINIO_POD" -- sh -c "
  mc alias set myminio http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD &&
  mc cors get myminio/$BUCKET_NAME
"

echo ""
echo "✅ CORS configuration completed successfully!"
echo ""
echo "Your resume images should now be included in PDF exports."
echo "If you still experience issues, check:"
echo "1. MinIO is accessible from your web application"
echo "2. Images are served with proper Content-Type headers"
echo "3. Browser console for any CORS errors"
