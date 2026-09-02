

# dmencu

Comprehensive system for field operations management, survey collection, and tracking based on Backend-Plus.


[![npm-version](https://img.shields.io/npm/v/dmencu.svg)](https://npmjs.org/package/dmencu)
[![downloads](https://img.shields.io/npm/dm/dmencu.svg)](https://npmjs.org/package/dmencu)
[![build](https://github.com/codenautas/dmencu/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/codenautas/dmencu/actions/workflows/build-and-test.yml)
[![coverage](https://img.shields.io/coveralls/codenautas/dmencu/master.svg)](https://coveralls.io/r/codenautas/dmencu)
[![security](https://socket.dev/api/badge/npm/package/dmencu)](https://socket.dev/npm/package/dmencu)
[![qa-control](https://github.com/codenautas/dmencu/actions/workflows/qa-control.yml/badge.svg)](https://github.com/codenautas/dmencu/actions/workflows/qa-control.yml)


language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)


An advanced framework and application specialized in statistical field operation management, field roadmaps (Hdr), survey data collection, and quality control. Built on top of the **Backend-Plus** ecosystem and PostgreSQL, it is fully optimized for field deployment via an Offline-First/PWA architecture.

Main features are:

1. **Field Operations & Roadmap Management (Hdr):**
   - Dynamic assignment and allocation of workloads per zone, area, surveyor, and supervisor.
   - Real-time tracking of survey progress at the dwelling, household, and individual levels.
   - Visit logging, non-response reason tracking, re-entries, and supervisory escalation workflows.
2. **Task Engine & Actions:**
   - Allows modeling tasks, configuring available actions for each, and assembling an operational workflow around them.
   - Automated audit logs tracking user activity, timestamped transitions, and historical edits.
3. **Centralized Metadata Architecture:**
   - Allows questionnaire modeling driven by metadata, validating skip patterns and valid inclusions through the "meta-enc" metadata engine.
   - **Consistency Engine & Validation Rules:** Automated real-time or post-entry logical and range validation.
   - **Permissions & Processes:** Granular access control for views, tables, and operational actions based on field roles (Surveyor, Supervisor, Data Entry, Field Coordinator).
4. **Offline-First Architecture (PWA) & Installer:**
   - Seamless background installation and updates managed via Service Worker (`swa`).
   - Publicly served static assets, manifests, and App Shell (decoupled from session cookies) ensuring total application resilience in low/no-signal areas.
   - Floating installation log console and non-intrusive overlay for credential re-validation.
5. **Advanced Grids & Survey UI:**
   - Interactive, editable, filterable, and sortable data grids with native XLSX export support.
   - Responsive user interface optimized for mobile devices and desktop operation.
