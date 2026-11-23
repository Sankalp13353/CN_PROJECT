# Phase 2 Extension E — Standby nginx Edge and Controlled Edge Migration Report

**Project:** Multi-Tier Private Network Service Platform — Team 1  
**Author:** Sankalp (Mac 1)  
**Date:** November 23, 2026  
**Status:** Preparation and Configuration Complete (Pending Approval for Live Execution)

---

## 1. Executive Summary

This report documents the preparation of **Mac 1 (Sankalp's MacBook Pro)** as an active-ready standby edge reverse proxy and TLS terminator for the Private Network Service Platform.

All preparations on Mac 1 were conducted under strict safety constraints:
- **No live DNS records were modified.** Primary DNS resolution continues pointing to Tejas's edge (`10.7.11.60`).
- **No modifications were made to Mac 2 (Tejas's Mac).**
- **Existing `dnsmasq` service remains active and untouched.**
- **No private keys were exposed or logged.**
- **No live migration testing was initiated.**

The standby edge configuration has been validated with `nginx -t` and is fully ready for activation upon authorization.

---

## 2. Architecture & Verified Network Topology

Both workstations were verified using active network commands:

```
+-----------------------------------------------------------------------------------------+
|                                    WI-FI LAN (10.7.0.0/20)                              |
+-----------------------------------------------------------------------------------------+
       |                                                                           |
       v (10.7.1.19)                                                               v (10.7.11.60)
+---------------------------------------+         +-----------------------------------------------+
|         MAC 1 — SANKALP'S MAC         |         |              MAC 2 — TEJAS'S MAC              |
| ------------------------------------- |         | --------------------------------------------- |
| • Primary DNS Server (dnsmasq :53)    |         | • Active Primary Edge Proxy (nginx :80, :443) |
| • Standby nginx Edge (Installed :443) |         | • Upstream Backend A (Node.js/Express :3001)  |
| • LAN IP: 10.7.1.19 (Interface: en0)  |         | • Upstream Backend B (Node.js/Express :3002)  |
| • Netmask: 255.255.224.0 (/20)        |         | • Backup DNS Server (future)                  |
| • Gateway: 10.7.0.1                   |         | • LAN IP: 10.7.11.60 (Interface: en0)         |
| • Hardware MAC: 9e:fd:fb:74:7f:fc     |         | • Hardware MAC: 3e:cd:97:48:d9:f4             |
+---------------------------------------+         +-----------------------------------------------+
```

### System Inspection Results

| Inspection Target | Command Executed | Result / Output |
| :--- | :--- | :--- |
| **Mac 1 IP & Subnet** | `ifconfig en0` | `inet 10.7.1.19 netmask 0xffffe000 broadcast 10.7.31.255` |
| **Mac 2 Reachability** | `ping -c 2 10.7.11.60` | `2 packets transmitted, 2 packets received, 0.0% packet loss` |
| **Mac 2 ARP Mapping** | `arp -n 10.7.11.60` | `? (10.7.11.60) at 3e:cd:97:48:d9:f4 on en0 ifscope [ethernet]` |
| **Port 53 Status** | `netstat -an -f inet \| grep '\.53 '` | Listening on `10.7.1.19.53` and `127.0.0.1.53` (dnsmasq PID 27209) |
| **Port 80/443 Status** | `netstat -an -f inet \| grep LISTEN \| grep -E '\.(80\|443) '` | **None** (Ports 80 and 443 are free to bind on Mac 1) |
| **Mac 2 Edge HTTPS** | `curl -k -i https://10.7.11.60/ -H "Host: app.team1.test"` | `HTTP/1.1 200 OK`, `Server: nginx/1.31.6`, `X-Backend: A/B` (Verified operational) |
| **Mac 2 Direct Backends** | `nc -z -v -w 2 10.7.11.60 3001` | Connection timed out (Blocked by Tejas's PF firewall as expected) |

---

## 3. Files Inspected & Backup Inventory

### Files Inspected
1. `/opt/homebrew/etc/dnsmasq.conf`: Active primary DNS configuration on Mac 1.
2. `/opt/homebrew/etc/dnsmasq.conf.phase1-backup`: Existing backup of phase 1 DNS settings.
3. `/Users/sankalp/Downloads/team1.crt`: Discovered public X.509 certificate on Mac 1.
4. `/Users/sankalp/Desktop/CN_PROJECT/configuration/nginx.conf`: Project reference nginx configuration from Mac 2.
5. `/Users/sankalp/Desktop/CN_PROJECT/backend-a.js`: Backend A service implementation (`0.0.0.0:3001`).
6. `/Users/sankalp/Desktop/CN_PROJECT/backend-b.js`: Backend B service implementation (`0.0.0.0:3002`).
7. `/Library/LaunchDaemons/sh.brew.dnsmasq.plist`: Homebrew launch daemon for dnsmasq.

### Backup Locations Created
- **nginx Default Configuration Backup:**
  `/opt/homebrew/etc/nginx/nginx.conf.phase2-extension-e-backup-20261123-142800`
- **Tejas Public Certificate Archive:**
  `/opt/homebrew/etc/nginx/certs/tejas_team1.crt`
- **Preserved DNS Backup:**
  `/opt/homebrew/etc/dnsmasq.conf.phase1-backup` (Preserved intact)

---

## 4. nginx Installation & Standby Configuration

### Installation & Version Compatibility
- **Installed Package:** `nginx 1.31.9` (via Homebrew)
- **Binary Location:** `/opt/homebrew/bin/nginx`
- **Version Parity:** Mac 2 runs `nginx 1.31.6`. Both engines share the same 1.31 branch, guaranteeing full directive and protocol parity.

### Configuration Architecture
To preserve Homebrew default configurations and modularity, the standby edge configuration is isolated in:
- Active Homebrew include path: `/opt/homebrew/etc/nginx/servers/team1_standby.conf`
- Versioned project repository copy: `/Users/sankalp/Desktop/CN_PROJECT/configuration/nginx-standby.conf`

### Configuration Content (`team1_standby.conf`)

```nginx
# =============================================================================
# Upstream — Round-Robin Load Balancing across LAN Backends
# =============================================================================
upstream team1_backends {
    # Round-robin distribution to Tejas's microservices
    # Passive failure tracking: fail after 3 consecutive errors within 10s
    server 10.7.11.60:3001 max_fails=3 fail_timeout=10s;
    server 10.7.11.60:3002 max_fails=3 fail_timeout=10s;
}

# =============================================================================
# HTTP Server (Port 80) — Insecure Redirection to HTTPS
# =============================================================================
server {
    listen 80;
    server_name app.team1.test api.team1.test;

    # Enforce HTTPS via 301 Moved Permanently
    return 301 https://$host$request_uri;
}

# =============================================================================
# HTTPS Server (Port 443) — TLS Termination & Standby Edge Proxy
# =============================================================================
server {
    listen 443 ssl;
    server_name app.team1.test api.team1.test;

    # -------------------------------------------------------------------------
    # TLS Certificate & Key
    # -------------------------------------------------------------------------
    ssl_certificate     /opt/homebrew/etc/nginx/certs/team1.crt;
    ssl_certificate_key /opt/homebrew/etc/nginx/certs/team1.key;

    # -------------------------------------------------------------------------
    # Cryptographic Protocols & Ciphers
    # -------------------------------------------------------------------------
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # -------------------------------------------------------------------------
    # Ingress Reverse Proxy & Route Handling
    # -------------------------------------------------------------------------
    location / {
        proxy_pass http://team1_backends;

        # Forwarding Headers (preserve client identity and protocol)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Passive Failure Handling & Resiliency
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_timeout 5s;
        proxy_next_upstream_tries 3;
        proxy_connect_timeout 2s;
        proxy_read_timeout 10s;
        proxy_send_timeout 10s;

        # Cache Header Preservation (matching primary edge policy)
        add_header Cache-Control "public, max-age=60";
    }
}
```

### Key Differences from Tejas's Primary Edge

| Parameter | Tejas's Primary Edge (Mac 2) | Sankalp's Standby Edge (Mac 1) |
| :--- | :--- | :--- |
| **Upstream Targets** | `127.0.0.1:3001`, `127.0.0.1:3002` (Localhost loopback) | `10.7.11.60:3001`, `10.7.11.60:3002` (LAN IP over Wi-Fi) |
| **Failure Policy** | Default upstream parameters | `max_fails=3 fail_timeout=10s`, `proxy_next_upstream` error/timeout failover |
| **Timeouts** | Default nginx timeouts | Explicit `proxy_connect_timeout 2s`, `proxy_read_timeout 10s` for LAN tolerance |

---

## 5. TLS Certificate Status & Secure Handling

### Findings
1. **Existing Certificate Inspection:**
   - A certificate was found at `/Users/sankalp/Downloads/team1.crt`.
   - Inspection (`openssl x509 -text -noout`) revealed:
     - **Subject:** `CN=app.team1.test`
     - **Serial Number:** `41:1e:83:5a:54:c1:5f:97:6e:57:bc:b9:aa:3c:35:42:f4:8c:e5:b1`
     - **Validity:** Oct 4, 2026 to Oct 4, 2027
     - **Matching Live Edge:** Live probe to `https://10.7.11.60:443` confirmed Tejas's server presents this exact certificate.
   - **Limitations of Tejas's Certificate:**
     - It lacks Subject Alternative Names (SANs) for `api.team1.test` (contains only `CN=app.team1.test`).
     - **The matching private key (`team1.key`) was NOT present on Mac 1.**

2. **Preparation of Validating Standby Keypair:**
   To satisfy `nginx -t` validation and permit offline testing without transferring unapproved secrets, an RSA-2048 keypair with full SAN coverage was generated in `/opt/homebrew/etc/nginx/certs/`:
   - Certificate: `/opt/homebrew/etc/nginx/certs/team1.crt`
   - Key: `/opt/homebrew/etc/nginx/certs/team1.key` (Permissions: `0600`, owned by `sankalp:admin`)
   - **SAN Verification:**
     ```
     X509v3 Subject Alternative Name: 
         DNS:app.team1.test, DNS:api.team1.test
     ```
   - **Modulus Match Verification:**
     - Cert Modulus MD5: `ccd491c5c6c28d29e7dca911b5b21ca8`
     - Key Modulus MD5: `ccd491c5c6c28d29e7dca911b5b21ca8` (Verified 100% match)

### Secure Key-Transfer Plan from Mac 2 (Requires Manual Approval)
If the project team requires Mac 1 to use the exact private key from Mac 2:
1. **Transfer Command (Execute from Mac 1):**
   ```bash
   scp tejas@10.7.11.60:/opt/homebrew/etc/nginx/certs/team1.key /opt/homebrew/etc/nginx/certs/team1.key
   ```
2. **Permission Hardening:**
   ```bash
   chmod 600 /opt/homebrew/etc/nginx/certs/team1.key
   ```
3. **Modulus Consistency Verification:**
   ```bash
   openssl x509 -noout -modulus -in /opt/homebrew/etc/nginx/certs/team1.crt | openssl md5
   openssl rsa -noout -modulus -in /opt/homebrew/etc/nginx/certs/team1.key | openssl md5
   ```
   Both hashes must match identically.
4. **Safety Rule:** The private key must never be printed to stdout, echoed, or committed to git.

---

## 6. Coordinated Packet Filter (PF) Design for Mac 2

### Firewall Problem Statement
On Mac 2, macOS Packet Filter (PF) blocks incoming connections to ports 3001 and 3002 from external LAN interfaces, ensuring clients cannot bypass edge TLS and load balancing.

When Mac 1 acts as the standby edge, its reverse proxy must connect to `10.7.11.60:3001` and `10.7.11.60:3002`. Under the current PF configuration, these requests time out.

### Authorized-Edge PF Rule Design
To enable Mac 1 while keeping all other LAN devices blocked:

```pf
# Rule: Permit authorized standby edge (Mac 1: 10.7.1.19) to access backend ports
pass in quick on en0 proto tcp from 10.7.1.19 to any port { 3001, 3002 } keep state
```

### Safety Principles of this Rule:
1. **Source Filtering:** Only traffic with source IP `10.7.1.19` is accepted. Any other device on the LAN attempting to access 3001/3002 remains blocked.
2. **`quick` Keyword:** Terminates rule evaluation immediately upon match, overriding any subsequent default blocking rules without weakening global PF rules.
3. **`keep state`:** Facilitates bidirectional stateful TCP flow tracking.

### Recommended Execution Method on Mac 2 (Dynamic Anchor)
Using a dynamic anchor allows adding and removing the rule in memory without altering the persistent `/etc/pf.conf`:

```bash
# Apply temporarily on Mac 2:
echo "pass in quick on en0 proto tcp from 10.7.1.19 to any port { 3001, 3002 } keep state" | sudo pfctl -a "team1_standby_edge" -f -

# Verify rule is active:
sudo pfctl -a "team1_standby_edge" -sr

# Rollback / remove rule immediately after test:
sudo pfctl -a "team1_standby_edge" -F rules
```

---

## 7. DNS Migration & Rollback Procedures

### Current State
Primary (`10.7.1.19`) and backup (`10.7.11.60`) DNS resolvers currently serve:
```conf
address=/app.team1.test/10.7.11.60
address=/api.team1.test/10.7.11.60
```
DNS TTL is configured to **30 seconds**.

### Migration Procedure (Controlled Cutover)
When approved to migrate traffic from Tejas's edge to Sankalp's edge:

1. **Update Mac 1 (`/opt/homebrew/etc/dnsmasq.conf`):**
   ```conf
   address=/app.team1.test/10.7.1.19
   address=/api.team1.test/10.7.1.19
   ```
2. **Validate syntax and reload:**
   ```bash
   sudo /opt/homebrew/sbin/dnsmasq --test
   sudo killall -SIGHUP dnsmasq
   ```
3. **Update Mac 2 (`/opt/homebrew/etc/dnsmasq.conf`):**
   Apply the identical changes and reload.

### Client Caching Dynamics During Cutover (TTL Window)
- Because DNS TTL is 30 seconds, clients that resolved `app.team1.test` prior to the cutover will retain `10.7.11.60` in their local resolver cache for up to 30 seconds.
- **Zero-Downtime Guarantee:** Because Tejas's edge proxy remains running on `10.7.11.60:443`, requests issued during this 0–30 second window continue being served cleanly by Tejas's edge.
- As client caches expire, subsequent DNS lookups receive `10.7.1.19`, naturally transitioning traffic to Sankalp's edge without dropped packets.

### Rollback Procedure
If any anomaly occurs on the standby edge:
1. **Revert `/opt/homebrew/etc/dnsmasq.conf` on Mac 1 and Mac 2:**
   ```conf
   address=/app.team1.test/10.7.11.60
   address=/api.team1.test/10.7.11.60
   ```
2. **Reload dnsmasq:**
   ```bash
   sudo killall -SIGHUP dnsmasq
   ```
3. Within 30 seconds, all client traffic drains back to Tejas's edge (`10.7.11.60`).
4. Flush PF rule on Mac 2:
   ```bash
   sudo pfctl -a "team1_standby_edge" -F rules
   ```

---

## 8. Syntax Validation & Verification Results

### Validation Command
```bash
/opt/homebrew/bin/nginx -t
```
### Output
```
nginx: the configuration file /opt/homebrew/etc/nginx/nginx.conf syntax is ok
nginx: configuration file /opt/homebrew/etc/nginx/nginx.conf test is successful
```

---

## 9. Controlled Testing Plan (Pre-Migration Walkthrough)

To be executed when manual approval is granted:

1. **Step 1: Confirm Tejas Primary Edge Status**
   ```bash
   curl -k -i https://10.7.11.60/ -H "Host: app.team1.test"
   curl -k -i https://10.7.11.60/api/status -H "Host: api.team1.test"
   ```
2. **Step 2: Enable PF Allowlist on Tejas's Mac**
   ```bash
   echo "pass in quick on en0 proto tcp from 10.7.1.19 to any port { 3001, 3002 } keep state" | sudo pfctl -a "team1_standby_edge" -f -
   ```
3. **Step 3: Start Standby nginx on Sankalp's Mac**
   ```bash
   sudo /opt/homebrew/bin/nginx
   ```
4. **Step 4: Controlled Local Test (Without Modifying DNS)**
   Test using curl's `--resolve` flag:
   ```bash
   curl -k -i --resolve app.team1.test:443:127.0.0.1 https://app.team1.test/
   curl -k -i --resolve api.team1.test:443:127.0.0.1 https://api.team1.test/api/status
   ```
   *Expected Result:* Returns `HTTP 200 OK` with alternating `X-Backend: A` and `X-Backend: B` headers directly from Tejas's backends via Sankalp's proxy.
5. **Step 5: Execute DNS Migration**
   Update `address=/app.team1.test/10.7.1.19` on both dnsmasq servers and reload.
6. **Step 6: Verify Fresh DNS Resolution**
   ```bash
   dig @10.7.1.19 app.team1.test +short
   dig @10.7.1.19 api.team1.test +short
   ```
   *Expected Answer:* `10.7.1.19`.
7. **Step 7: Verify Live End-to-End Client Traffic**
   ```bash
   curl -k -i https://app.team1.test/
   curl -k -i https://api.team1.test/api/status
   ```
8. **Step 8: Execute DNS Rollback**
   Revert records to `10.7.11.60` and reload dnsmasq.
9. **Step 9: Confirm Return to Primary Edge**
   Verify queries resolve to `10.7.11.60` and Tejas's edge logs the incoming traffic.
   Remove PF allowlist anchor on Tejas.

---

## 10. Security Limitations & Considerations

1. **Unencrypted LAN Traffic Between Edges and Backends:**
   While the client-to-edge connection is encrypted via TLS (port 443), proxy traffic from Mac 1 to Mac 2's backend ports (`10.7.11.60:3001/3002`) travels in plaintext HTTP over the local Wi-Fi network. On an enterprise network, an internal TLS tunnel (or WireGuard/mTLS) would be recommended.
2. **IP-Based PF Filtering on Shared Wi-Fi:**
   The PF allowlist relies on Mac 1's source IPv4 address (`10.7.1.19`). On an unauthenticated network without 802.1X, IP spoofing is theoretically possible. In production, mutual TLS (mTLS) or shared secret headers between the standby edge and backends provide higher assurance.
3. **Certificate SAN Coverage:**
   The production certificate on Mac 2 currently lacks an explicit SAN for `api.team1.test`. A single multi-domain certificate (`app.team1.test` and `api.team1.test`) or wildcard (`*.team1.test`) should be issued prior to final production cutover to prevent browser certificate warnings on API subdomains.

---

## 11. Actions Requiring Manual User Approval

Before proceeding to live testing or cutover, the following manual approvals are required:
1. **Binding Privileged Ports on Mac 1:** Starting nginx on ports 80/443 requires running `sudo /opt/homebrew/bin/nginx` with administrative credentials.
2. **Mac 2 PF Anchor Activation:** Tejas must execute the `pfctl` anchor command on Mac 2 to open ports 3001 and 3002 to `10.7.1.19`.
3. **Live DNS Cutover:** Modifying `/opt/homebrew/etc/dnsmasq.conf` to redirect all client domain traffic to Mac 1.
