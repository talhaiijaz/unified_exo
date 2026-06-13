# Onboarding — New Lab Members

Welcome to the Nanotech Lab unified server project.

## 1. Get GitHub access

Send your **GitHub username** to **Dr. Waqas Khalid** for access to [jadoo-tech](https://github.com/jadoo-tech).

## 2. Fork and clone

```bash
# Fork https://github.com/jadoo-tech/unified_server on GitHub, then:
git clone git@github.com:YOUR_USERNAME/unified_server.git
cd unified_server
git remote add upstream git@github.com:jadoo-tech/unified_server.git
```

## 3. Run locally

```bash
./scripts/start_server.sh
# Frontend: http://localhost:3000/portal/exo
# API:      http://localhost:5000/docs
```

## 4. Make your change

| I want to… | Read | Work in |
|------------|------|---------|
| Add a webpage | [FRONTEND.md](FRONTEND.md) | `nanotech_website/` |
| Add an API | [BACKEND.md](BACKEND.md) | `server/` |
| Add Pi device | [PI_AGENT.md](PI_AGENT.md) | `pi_agent/` |
| My own experiment | [../contrib/README.md](../contrib/README.md) | `contrib/yourname/` |

## 5. Open a Pull Request

```bash
git checkout -b feature/short-description
git add .
git commit -m "feat: describe your change"
git push origin feature/short-description
```

Open PR on GitHub → `jadoo-tech/unified_server` `main`.

## 6. After merge

A deployer runs `./scripts/deploy.sh` on the production server. Your change goes live at:

**http://nanotechserver.ddns.net:8080**

## Questions?

- Repo layout: [STRUCTURE.md](../STRUCTURE.md)
- Full overview: [OVERVIEW.md](OVERVIEW.md)
- How to contribute: [CONTRIBUTING.md](../CONTRIBUTING.md)
