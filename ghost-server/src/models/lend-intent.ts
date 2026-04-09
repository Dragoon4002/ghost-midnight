import mongoose, { Schema, type Document } from 'mongoose';

export type LendIntentStatus = 'open' | 'matched' | 'cancelled';

export interface LendIntentDoc extends Document {
  intentId: string;
  lender: string;
  amount: string;        // BigInt as string (microNIGHT)
  rMin: number;          // basis points
  status: LendIntentStatus;
  matchedLoanId?: string;
  createdAt: Date;
  matchedAt?: Date;
}

const LendIntentSchema = new Schema<LendIntentDoc>({
  intentId: { type: String, required: true, unique: true, index: true },
  lender: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  rMin: { type: Number, required: true },
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

export const LendIntent = mongoose.model<LendIntentDoc>('LendIntent', LendIntentSchema);
