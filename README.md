# GymTrack Cloud — versione corretta

Questa versione corregge la configurazione D1 e semplifica la pubblicazione su Windows.

## Metodo consigliato su Windows

1. Installa **Node.js LTS** da https://nodejs.org/ se non lo hai già.
2. Estrai completamente lo ZIP in una cartella normale, ad esempio `C:\GymTrackCloudflare_FIXED`.
3. Apri la cartella ed esegui `setup-windows.bat` con doppio clic.
4. Quando Cloudflare apre il browser, autorizza Wrangler.
5. Alla fine cerca nel terminale l'indirizzo `https://...workers.dev`.

Il file esegue in sequenza:

```text
npm install
npx wrangler login
npx wrangler d1 create gymtrack-db --jurisdiction eu --binding DB --update-config
npx wrangler d1 execute DB --remote --file=./schema.sql
npx wrangler deploy
```

Cloudflare Wrangler supporta `--binding` e `--update-config` per aggiungere automaticamente il database D1 alla configurazione.

## Metodo manuale

Apri **Prompt dei comandi (cmd)** nella cartella del progetto. Su Windows è preferibile a PowerShell se compare l'errore relativo a `npm.ps1` / execution policy.

Controlla prima:

```text
node -v
npm -v
```

Poi:

```text
npm install
npx wrangler login
npx wrangler d1 create gymtrack-db --jurisdiction eu --binding DB --update-config
npx wrangler d1 execute DB --remote --file=./schema.sql
npx wrangler deploy
```

## Errori comuni

### `'npm' non è riconosciuto`
Node.js non è installato o il terminale non è stato riaperto dopo l'installazione. Installa Node.js LTS e riapri il Prompt dei comandi.

### `npm.ps1 cannot be loaded` / esecuzione script disabilitata
Usa **Prompt dei comandi (cmd)** anziché PowerShell. In alternativa, da PowerShell puoi chiamare `npm.cmd` e `npx.cmd`.

### `D1 binding DB not found`
La configurazione non contiene ancora il database. Esegui:

```text
npx wrangler d1 create gymtrack-db --jurisdiction eu --binding DB --update-config
```

### `database already exists`
Non cancellare il database. Esegui:

```text
npx wrangler d1 list
```

e inviami l'output: ti aiuto a collegare quello esistente al binding `DB`.

### `Not authenticated` / login richiesto
Esegui:

```text
npx wrangler login
```

### Errore durante deploy
Esegui:

```text
npx wrangler --version
npx wrangler deploy
```

e inviami le ultime 15-20 righe dell'errore.
