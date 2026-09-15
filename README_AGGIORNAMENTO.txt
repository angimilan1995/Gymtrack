GYMTRACK - AGGIORNAMENTO WEB APP

Questa versione include:
- pesi dell'allenamento precedente precompilati per ogni singola serie;
- riferimento visibile "Ultima volta: X rip. × Y kg";
- fallback al peso base della scheda se non esiste uno storico per quella serie;
- login con nome utente;
- database Cloudflare D1 già collegato al binding DB;
- PWA installabile;
- storico serie, progressi, riordino esercizi e UI mobile-first.

PER PUBBLICARE L'AGGIORNAMENTO
1. Estrai tutta la cartella.
2. Fai doppio clic su AGGIORNA_WEBAPP.cmd.
3. Non eseguire d1 create: il database esistente viene mantenuto.

Database configurato:
- binding: DB
- database_name: gymtrack-db
- database_id: 2806645e-02e4-4dc8-a54f-192205994735

Il comando di deploy usato e':
  npx.cmd wrangler deploy
