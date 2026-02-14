import { Context } from "hono";
import { getActorFromSession } from "../auth/session";
import { Actor } from "../authorization/types";
import HonoAppType from "../../types/honoAppType";
import { createDbDataService } from "./db-service";
import { DataService, PresignService } from "./types";
import { createR2PresignService } from "../storage/presign";

export type ResolveActor = (
  c: Context<HonoAppType>,
) => Promise<Actor | null> | Actor | null;

export type GetDataService = (c: Context<HonoAppType>) => DataService;

export type GetPresignService = (c: Context<HonoAppType>) => PresignService;

export type AppDependencies = {
  resolveActor: ResolveActor;
  getDataService: GetDataService;
  getPresignService: GetPresignService;
};

export const createDefaultDependencies = (): AppDependencies => ({
  resolveActor: getActorFromSession,
  getDataService: (c) => createDbDataService(c.env.db),
  getPresignService: (c) => createR2PresignService(c.env),
});
