import mongoose, { Schema, type Document } from 'mongoose';

export type BorrowIntentStatus = 'open' | 'matched' | 'cancelled';

export interface BorrowIntentDoc extends Document {
  intentId: string;
  borrower: string;
  amount: string;
  rMax: number;
  collateral: string;    // v0: stored but not enforced
  status: BorrowIntentStatus;
  matchedLoanId?: string;
  createdAt: Date;
  matchedAt?: Date;
}

const BorrowIntentSchema = new Schema<BorrowIntentDoc>({
  intentId: { type: String, required: true, unique: true, index: true },
  borrower: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  rMax: { type: Number, required: true },
  collateral: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'matched', 'cancelled'],
    default: 'open',
    index: true,
  },
  matchedLoanId: { type: String },
  createdAt: { type: Date, default: () => new Date() },
  matchedAt: { type: Date },
});

export const BorrowIntent = mongoose.model<BorrowIntentDoc>('BorrowIntent', BorrowIntentSchema);
