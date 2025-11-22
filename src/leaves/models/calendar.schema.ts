import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CalendarDocument = HydratedDocument<Calendar>;

@Schema({ timestamps: true })
export class Calendar {
  @Prop({ required: true })
  year: number;

  @Prop({
    type: [{ date: Date, name: String, type: String }],
    default: [],
  })
  holidays: { date: Date; name: string; type: string }[];

  @Prop({
    type: [{ from: Date, to: Date, reason: String }],
    default: [],
  })
  blockedPeriods: { from: Date; to: Date; reason: string }[];
}

export const CalendarSchema = SchemaFactory.createForClass(Calendar);
