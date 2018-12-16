import { Document } from 'mongoose';
import { StateEnum } from '@/common/enum/state';

export interface Heros {
  name?: string;
  content?: string;
  state?: string;
  ip?: string;
  city?: string;
  range?: number[];
  country?: string;
  agent?: string;
  create_time?: Date;
}

export interface HerosHasId extends Heros, Document {
  _id: string;
}

export interface HerosQuery {
  offset?: string;
  limit?: string;
  keyword?: string;
  state?: keyof typeof StateEnum;
}
