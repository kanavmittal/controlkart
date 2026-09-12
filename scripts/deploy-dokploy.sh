#!/usr/bin/env bash
set -euo pipefail

: "${APPLICATION_ID:?Application ID is required}"
: "${DOCKER_IMAGE:?Immutable image tag is required}"
: "${DOKPLOY_URL:?Dokploy URL is required}"
: "${DOKPLOY_API_TOKEN:?Dokploy API token is required}"
[[ "$DOKPLOY_URL" == https://* ]] || { echo 'Dokploy requires HTTPS'; exit 1; }

headers=(-H "x-api-key: $DOKPLOY_API_TOKEN" -H 'Content-Type: application/json')
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" ]]; then
  : "${CF_ACCESS_CLIENT_SECRET:?Cloudflare Access secret is required}"
  headers+=(-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
fi

request() {
  local endpoint="$1" body="$2" status
  status=$(curl --silent --show-error --connect-timeout 15 --max-time 60 \
    --output /dev/null --write-out '%{http_code}' \
    --request POST "${DOKPLOY_URL%/}/api/$endpoint" "${headers[@]}" --data "$body")
  [[ "$status" =~ ^2[0-9][0-9]$ ]] || { echo "$endpoint failed: HTTP $status"; exit 1; }
}

request application.saveDockerProvider "$(jq -n \
  --arg applicationId "$APPLICATION_ID" --arg dockerImage "$DOCKER_IMAGE" \
  '{applicationId: $applicationId, dockerImage: $dockerImage, username: null, password: null, registryUrl: "ghcr.io"}')"
request application.deploy "$(jq -n --arg applicationId "$APPLICATION_ID" '{applicationId: $applicationId}')"
echo 'Deployment queued in Dokploy. Verify deployment status and health before considering the release complete.'
