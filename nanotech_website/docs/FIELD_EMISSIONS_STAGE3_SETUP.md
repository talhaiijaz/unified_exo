# Field Emissions Stage 3 Setup (Pi Backend)

Stage 3 is wired in the website through these Next.js proxy routes:

- `GET /api/field-emissions/config`
- `POST /api/field-emissions/run`
- `POST /api/field-emissions/toggle-emitter`

Until a backend is configured, these routes intentionally return a clear `503` message.

## What To Do Next

1. Deploy your field-emissions backend on Raspberry Pi (or another always-on host) with:
   - `POST /run`
   - `POST /toggle_emitter`
2. In Vercel project environment variables, set:
   - `FIELD_EMISSIONS_BACKEND_URL=https://<your-pi-host-or-domain>`
3. Redeploy the website.
4. Open Portal -> Calculations -> Field Emissions GUI -> Hardware Bridge (Stage 3).
5. Verify:
   - `Run On Backend (/run)` returns JSON response.
   - Emitter On/Off calls return success responses.

## Payload Notes

The website currently sends `POST /run` payload as:

```json
{
  "matrix": [[0,1,0], [1,1,0]],
  "params": {
    "beam_current": 0.5,
    "min_spot_radius_nm": 500
  }
}
```

If your Pi backend expects different field names, adapt the mapping in:

- `app/api/field-emissions/run/route.ts`

Do not change the frontend payload first; keep normalization in the server proxy.

