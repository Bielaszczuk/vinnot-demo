import { createEventDraftService } from "./eventDraft.service";
import { eventDraftStorage } from "@/infrastructure/storage/eventDraft.storage";

export const eventDraftService = createEventDraftService(eventDraftStorage);
