# Contributor Projects

Add your lab experiments, pages, or modules here without conflicting with core code.

## Layout

```
contrib/
├── your-github-username/
│   ├── README.md       # What this is, how to run it
│   ├── frontend/       # Optional Next.js pages/components
│   ├── backend/        # Optional API routes (wire in via PR)
│   └── notes/          # Docs, diagrams, data specs
└── example/            # Template — copy this to start
```

## Workflow

1. Fork [jadoo-tech/unified_server](https://github.com/jadoo-tech/unified_server)
2. Create `contrib/your-github-username/`
3. Build your feature; open a PR to integrate into main app if needed
4. A maintainer reviews and deploys to [nanotechserver](http://nanotechserver.ddns.net:8080)

## Integrating into the main app

| You built… | Maintainer wires it into… |
|------------|---------------------------|
| A new page | `nanotech_website/app/` + nav links |
| A new API | `server/routes/` + `app.py` |
| Pi device | `pi_agent/devices/` |

Keep work in `contrib/` until a PR moves it into the core paths above.
