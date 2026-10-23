import assert from 'node:assert/strict';
import { createHmac, webcrypto } from 'node:crypto';
import test from 'node:test';
import { classifyOrder, qrReference } from './qrReconcile.ts';
import { verifyMpWebhookSignature } from './mpWebhookSignature.ts';

globalThis.crypto ??= webcrypto;

const attempt = {
  id: '12345678-1234-1234-1234-123456789abc',
  mp_order_id: 'ORD01234567890123456789012345',
  pos_external_id: 'CAJA_TEST',
  monto: 7600,
};

function order(overrides = {}) {
  return {
    id: attempt.mp_order_id,
    type: 'qr',
    status: 'processed',
    status_detail: 'accredited',
    external_reference: qrReference(attempt.id),
    total_amount: '7600.00',
    total_paid_amount: '7600.00',
    currency: 'ARS',
    config: { qr: { external_pos_id: attempt.pos_external_id } },
    transactions: { payments: [{ status: 'processed', status_detail: 'accredited', paid_amount: '7600.00' }] },
    ...overrides,
  };
}

test('accepts only the credited order for this attempt', () => {
  assert.equal(classifyOrder(order(), attempt).estado, 'acreditado');
  assert.equal(classifyOrder(order({ total_amount: '7601.00' }), attempt).estado, 'revision');
  assert.equal(classifyOrder(order({ external_reference: 'other' }), attempt).estado, 'revision');
  assert.equal(classifyOrder(order({ config: { qr: { external_pos_id: 'OTHER' } } }), attempt).estado, 'revision');
  assert.equal(classifyOrder(order({ transactions: { payments: [] } }), attempt).estado, 'revision');
});

test('never treats a refunded order as an unpaid cancellation', () => {
  assert.equal(classifyOrder(order({ status: 'refunded', status_detail: 'refunded' }), attempt).estado, 'revision');
  assert.equal(classifyOrder(order({ status: 'created', status_detail: 'created' }), attempt).estado, 'pendiente');
});

test('verifies the Mercado Pago HMAC manifest and rejects modifications', async () => {
  const secret = 'test-secret';
  const requestId = 'request-123';
  const ts = '1742505638683';
  const digest = createHmac('sha256', secret)
    .update(`id:${attempt.mp_order_id};request-id:${requestId};ts:${ts};`).digest('hex');
  const signature = `ts=${ts},v1=${digest}`;
  assert.equal(await verifyMpWebhookSignature(signature, requestId, attempt.mp_order_id, secret), true);
  assert.equal(await verifyMpWebhookSignature(signature, requestId, 'ORD00000000000000000000000000', secret), false);
  assert.equal(await verifyMpWebhookSignature(signature, 'different', attempt.mp_order_id, secret), false);
});
