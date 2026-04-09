import mongoose, { Schema, type Document } from 'mongoose';

export type LoanStatus = 'awaiting-settlement' | 'active' | 'failed';

export interface LoanDoc extends Document {
  loanId: string;
  lender: string;
  borrower: string;
  principal: string;             // matched amount
  rate: number;                  // clearing rate (bps)
  lendIntentId: string;
  borrowIntentId: string;
  status: LoanStatus;
  createdAt: Date;
  settledAt?: Date;
  settlementTxId?: string;
}

const LoanSchema = new Schema<LoanDoc>({
  loanId: { type: String, required: true, unique: true, index: true },
  lender: { type: String, required: true, index: true },
  borrower: { type: String, required: true, index: true },
  principal: { type: String, required: true },
  rate: { type: Number, required: true },
  lendIntentId: { type: String, required: true },
  borrowIntentId: { type: String, required: true },
  status: {
    type: String,
    enum: ['awaiting-settlement', 'active', 'failed'],
    default: 'awaiting-settlement',
    index: true,
  },
  createdAt: { type: Date, default: () => new Date() },
  settledAt: { type: Date },
  settlementTxId: { type: String },
});

export const Loan = mongoose.model<LoanDoc>('Loan', LoanSchema);
