#!/usr/bin/env bash
# Bring Docker up in a way that works inside the nested Cloud Agent VM, idempotently.
# Safe to call from both install and start.
set -euo pipefail

sudo mkdir -p /etc/docker
# overlay2 cannot stack on the pod's existing overlayfs; fuse-overlayfs works here.
echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null

if ! sudo docker info >/dev/null 2>&1; then
  sudo bash -c 'nohup dockerd >/var/log/dockerd.log 2>&1 &'
  for _ in $(seq 1 60); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi

# Let the non-root user talk to the daemon without sudo.
sudo groupadd -f docker
sudo usermod -aG docker "$(id -un)" || true
sudo chmod 666 /var/run/docker.sock || true

# In nested VMs, container-to-container traffic on custom bridges is dropped when
# bridged frames are pushed through iptables. Turning that off lets the Supabase
# services reach each other (Postgres, PostgREST, Storage, etc.).
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 >/dev/null 2>&1 || true
sudo sysctl -w net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true
