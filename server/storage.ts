import { type User, type InsertUser, type Transcript, type InsertTranscript } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  getTranscriptsByMeetingId(meetingId: string): Promise<Transcript[]>;
  getAllTranscripts(): Promise<Transcript[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private transcripts: Map<string, Transcript>;

  constructor() {
    this.users = new Map();
    this.transcripts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const id = randomUUID();
    const transcript: Transcript = {
      ...insertTranscript,
      id,
      createdAt: new Date(),
    };
    this.transcripts.set(id, transcript);
    return transcript;
  }

  async getTranscriptsByMeetingId(meetingId: string): Promise<Transcript[]> {
    return Array.from(this.transcripts.values()).filter(
      (t) => t.meetingId === meetingId
    );
  }

  async getAllTranscripts(): Promise<Transcript[]> {
    return Array.from(this.transcripts.values());
  }
}

export const storage = new MemStorage();
