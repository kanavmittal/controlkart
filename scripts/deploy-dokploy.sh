#!/usr/bin/env bash
set -euo pipefail

: "${APPLICATION_ID:?Application ID is required}"
: "${DOCKER_IMAGE:?Immutable image tag is required}"
: "${DOKPLOY_URL:?Dokploy URL is required}"
: "${DOKPLOY_API_TOKEN:?Dokploy API token is required}"
: "${HEALTHCHECK_URL:?Public health URL is required}"
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
release_title="GitHub ${GITHUB_RUN_ID:-manual}-${GITHUB_RUN_ATTEMPT:-1} ${DOCKER_IMAGE##*:}"
request application.deploy "$(jq -n --arg applicationId "$APPLICATION_ID" --arg title "$release_title" '{applicationId: $applicationId, title: $title}')"

for attempt in $(seq 1 60); do
  deployments=$(curl --fail --silent --show-error --connect-timeout 15 --max-time 30 \
    "${DOKPLOY_URL%/}/api/deployment.all?applicationId=$APPLICATION_ID" "${headers[@]}")
  state=$(jq -r --arg title "$release_title" '[.[] | select(.title == $title)][0].status // "pending"' <<< "$deployments")
  if [[ "$state" == error ]]; then
    echo 'Dokploy reported a deployment failure'; exit 1
  fi
  if [[ "$state" == done ]]; then
    for health_attempt in $(seq 1 30); do
      if curl --fail --silent --show-error --connect-timeout 10 --max-time 15 "$HEALTHCHECK_URL" > /dev/null; then
        if [[ -n "${CATALOG_CHECK_URL:-}" ]]; then
          curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
            -H "x-publishable-api-key: $NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" \
            "$CATALOG_CHECK_URL" | jq -e '.products | type == "array"' > /dev/null
        fi
        echo 'Dokploy completed the release and public health checks passed.'
        exit 0
      fi
      sleep 10
    done
    echo 'The deployed application did not become healthy'; exit 1
  fi
  sleep 10
done
echo 'Timed out waiting for Dokploy deployment'; exit 1
