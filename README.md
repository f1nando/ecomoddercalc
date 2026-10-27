# EcoModderCalc

Independent, client-side road-load / engine-power calculator. Not affiliated with
EcoModder.com; no original site code, branding images, ads, forum or PHP copied.
Published equations are reimplemented in `public/calc.js`.

**Calculator:** https://f1nando.github.io/ecomoddercalc/

**Source:** https://github.com/f1nando/ecomoddercalc

Alternative hosting: https://ecomoddercalc.demotest.live

## Run and test

Node 20+; no npm dependencies or build step:

```sh
npm test
npm start
```

Local URL: http://127.0.0.1:5199 (`PORT` overrides it). Deploy **only `public/`**.
No login, API keys, database, analytics, localStorage or server-side calculation.

## Physics and limitations

- V and headwind are entered in km/h, converted to m/s.
- Road grade is percent: 100 tan(angle). Only level ground and uphill are supported.
- Rolling force = m g f cos(angle); grade force = m g sin(angle).
- Aerodynamic force = 0.5 rho Cd A (v + headwind)^2.
- Wheel power = (rolling + grade + aero) v / 1000, kW.
- Engine shaft power = wheel power / drivetrain efficiency + shaft auxiliary kW.
- Thermal efficiency affects estimated fuel consumption, never mechanical demand.
- Fuel input is Wh per **US gallon**; 1 US gal = 3.785411784 L. Standstill L/100km
  is undefined and displayed as a dash, not zero.
- Eco profile: rho=1.225, g=9.80665. Vehicle Physics profile: rho=1.184, g=9.81.
  Density may be explicitly overridden; the actual parameters are printed/exported.
- Uniform motion only: no acceleration, gearing, maximum engine power, traction,
  braking, WLTP or real-world fuel-consumption certification is claimed.
- The optional 40% thermal efficiency and 37953 Wh/USgal are illustrative diesel
  inputs, not independently established specifications of any preset vehicle.

The 30 vehicle presets are transcribed from the owner's exercise. Default #13 is
Volvo FH16, 20000kg / 90% / Cd .64 / A 8.5m². Manual edits mark the preset custom.
Editing invalidates old results and disables CSV/print until a valid recalculation.

## Sources / attribution

- EcoModder public equations and archived default example:
  https://web.archive.org/web/20260618042557/https://www.ecomodder.com/forum/tool-aero-rolling-resistance.php
- Vehicle Physics public formula and real form outputs:
  https://www.electromotive.eu/?page_id=12

Tests bind FH16 values, 15 independently observed Vehicle Physics outputs and the
archived Golf 10mph wheel-power result. This is not a claim of proprietary PHP
source parity. In academic submissions cite **EcoModderCalc** as the tool used;
screenshots must not be described as successful runs of the original EcoModder.

## Deployment

### GitHub Pages (independent of the application server)

`.github/workflows/pages.yml` runs the numerical tests, then publishes only
`public/` to GitHub Pages on each push to `main`. Pull requests run tests without
deploying. No dependencies, build, server, secrets or API keys are required.
All asset/module links are relative, so the `/ecomoddercalc/` project path works.
The original hostname remains on its existing server; no DNS change is needed.
Pages uses GitHub's hosting and TLS, not the nginx configuration in `deploy/`.
The nginx-specific security headers are not configurable on standard Pages;
they should not be assumed to be present on the GitHub-hosted address.

### Separate nginx hosting

Published 2026-10-27: **https://ecomoddercalc.demotest.live**, SSH alias `bkserv`.

- Static release: `/var/www/ecomoddercalc/releases/20261027-ecocalc-1`.
- Served symlink: `/var/www/ecomoddercalc/current`.
- Dedicated vhost: `/etc/nginx/sites-available/ecomoddercalc.demotest.live`,
  enabled through the same-named link in `sites-enabled`.
- Persistent ACME webroot: `/var/www/ecomoddercalc/acme`.
- Hostname-only Let's Encrypt certificate under
  `/etc/letsencrypt/live/ecomoddercalc.demotest.live`, initially expires
  2027-01-25. Existing Certbot account and active renewal timer were reused.
- Scoped deploy hook: `/etc/letsencrypt/renewal-hooks/deploy/ecomoddercalc.sh`;
  validates/reloads nginx only when this certificate renews. Renewal is configured,
  not yet observed over a real certificate renewal cycle.
- Config templates and renewal hook are in `deploy/`; only `public/` is served.
  Security headers/CSP, hidden-file denial and revalidating cache policy enabled.

Both configuration stages passed `nginx -t` before graceful reload (no service
restart). The first HTTP probe immediately after reload saw the preceding routing
state (404); subsequent HTTP returned 200, then final HTTP correctly redirects 301
to HTTPS. No unrelated vhost, application service or database was modified.
No production Node service, package installation or build is required.

Validation: 13/13 numerical/unit tests and 10/10 browser checks on both localhost
and the actual HTTPS site, including CSV download, print/PDF, profile switching,
invalid-input/stale-export guards, 390px/320px layout, no page errors or external
requests. Public bytes of all five assets matched local files exactly by SHA-256;
TLS validation, HTTP redirect, JavaScript MIME types, security headers and denial
of private/source-only paths were also checked. Browser reports/screenshots are
kept outside this repository; no student documents or account data are published.

For an update, upload only the five public assets into a **new** release directory,
verify them, then atomically replace `current` with a symlink to that release.
Retain older releases for rollback. Do not change unrelated sites/certificates.
