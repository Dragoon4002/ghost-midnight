import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import * as store from './store.js';
import { logger } from './logger.js';

export const routes = new Hono();

// ─── health ───────────────────────────────────────────────────────
routes.get('/health', (c) => {
  return c.json({
    ok: true,
    openIntents: {
      lend: store.countOpenLends(),
      borrow: store.countOpenBorrows(),
    },
    activeLoans: store.countActiveLoans(),
  });
});

// ─── submit lend intent ───────────────────────────────────────────
routes.post('/api/v1/intents/lend', async (c) => {
  const body = await c.req.json<{ lender: string; amount: string; rMin: number }>();

  if (!body.lender || !body.amount || body.rMin == null) {
    return c.json({ error: 'missing fields: lender, amount, rMin' }, 400);
  }
  try {
    if (BigInt(body.amount) <= 0n) {
      return c.json({ error: 'amount must be positive' }, 400);
    }
  } catch {
    return c.json({ error: 'amount must be integer string' }, 400);
  }
  if (body.rMin < 0 || body.rMin > 100000) {
    return c.json({ error: 'rMin out of range 0..100000 bps' }, 400);
  }

  const intentId = `lend_${nanoid(12)}`;
  store.createLend({
    intentId,
    lender: body.lender,
    amount: body.amount,
    rMin: body.rMin,
  });

  logger.lendIntent(
    { intentId, lender: body.lender, amount: body.amount, rMin: body.rMin },
    'lend intent submitted',
  );

  return c.json({ intentId }, 201);
});

// ─── submit borrow intent ─────────────────────────────────────────
routes.post('/api/v1/intents/borrow', async (c) => {
  const body = await c.req.json<{
    borrower: string;
    amount: string;
    rMax: number;
    collateral: string;
  }>();

  if (!body.borrower || !body.amount || body.rMax == null || !body.collateral) {
    return c.json(
      { error: 'missing fields: borrower, amount, rMax, collateral' },
      400,
    );
  }
  try {
    if (BigInt(body.amount) <= 0n) return c.json({ error: 'amount must be positive' }, 400);
    if (BigInt(body.collateral) <= 0n) {
      return c.json({ error: 'collateral must be positive' }, 400);
    }
  } catch {
    return c.json({ error: 'amount/collateral must be integer strings' }, 400);
  }
  if (body.rMax < 0 || body.rMax > 100000) {
    return c.json({ error: 'rMax out of range 0..100000 bps' }, 400);
  }

  const intentId = `borrow_${nanoid(12)}`;
  store.createBorrow({
    intentId,
    borrower: body.borrower,
    amount: body.amount,
    rMax: body.rMax,
    collateral: body.collateral,
  });

  logger.borrowIntent(
    {
      intentId,
      borrower: body.borrower,
      amount: body.amount,
      rMax: body.rMax,
      collateral: body.collateral,
    },
    'borrow intent submitted',
  );

  return c.json({ intentId }, 201);
});

// ─── cancel intent ────────────────────────────────────────────────
routes.post('/api/v1/intents/:id/cancel', (c) => {
  const id = c.req.param('id');

  const lend = store.cancelLend(id);
  if (lend) {
    logger.info({ intentId: id }, 'lend intent cancelled');
    return c.json({ ok: true, kind: 'lend' });
  }

  const borrow = store.cancelBorrow(id);
  if (borrow) {
    logger.info({ intentId: id }, 'borrow intent cancelled');
    return c.json({ ok: true, kind: 'borrow' });
  }

  return c.json({ error: 'intent not found or not open' }, 404);
});

// ─── list all intents + loans ─────────────────────────────────────
routes.get('/api/v1/intents', (c) => {
  return c.json({
    lends: store.findAllLends(200),
    borrows: store.findAllBorrows(200),
    loans: store.findAllLoans(200),
  });
});

// ─── intents for one address ──────────────────────────────────────
routes.get('/api/v1/intents/by/:addr', (c) => {
  const addr = c.req.param('addr');
  return c.json({
    lends: store.findLendsByAddr(addr),
    borrows: store.findBorrowsByAddr(addr),
  });
});

// ─── matches (loans) for one address ──────────────────────────────
routes.get('/api/v1/matches/:addr', (c) => {
  const addr = c.req.param('addr');
  return c.json({ loans: store.findLoansForAddr(addr) });
});

// ─── confirm settlement ───────────────────────────────────────────
routes.post('/api/v1/loans/:id/settle', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ txId: string }>();
  if (!body.txId) return c.json({ error: 'missing txId' }, 400);

  const loan = store.settleLoan(id, body.txId);
  if (!loan) return c.json({ error: 'loan not found or not awaiting settlement' }, 404);

  logger.loanActive(
    {
      loanId: loan.loanId,
      lender: loan.lender,
      borrower: loan.borrower,
      principal: loan.principal,
      rate: loan.rate,
      txId: body.txId,
    },
    'loan settled and active',
  );

  return c.json({ ok: true, loan });
});
