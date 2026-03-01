#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <deploy|upload> [args...]" >&2
  exit 1
fi

command_name="$1"
shift

if [ "$command_name" != "deploy" ] && [ "$command_name" != "upload" ]; then
  echo "Unsupported command: $command_name (expected deploy or upload)" >&2
  exit 1
fi

has_env_flag="false"
for arg in "$@"; do
  case "$arg" in
    --env | --env=*)
      has_env_flag="true"
      break
      ;;
  esac
done

if [ "$has_env_flag" = "false" ]; then
  deploy_env="${OPENNEXT_CF_ENV:-production}"
  set -- --env "$deploy_env" "$@"
fi

max_attempts="${OPENNEXT_CF_MAX_ATTEMPTS:-3}"
retry_delay_seconds="${OPENNEXT_CF_RETRY_DELAY_SECONDS:-10}"

attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  echo "OpenNext Cloudflare ${command_name} attempt ${attempt}/${max_attempts}"
  if pnpm exec opennextjs-cloudflare "$command_name" "$@"; then
    exit 0
  else
    exit_code=$?
  fi
  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "OpenNext Cloudflare ${command_name} failed after ${max_attempts} attempts." >&2
    exit "$exit_code"
  fi

  echo "Command failed with exit code ${exit_code}. Retrying in ${retry_delay_seconds}s..." >&2
  sleep "$retry_delay_seconds"
  attempt=$((attempt + 1))
done
