import { Context } from "hono";
import { can } from "../authorization/policy";
import { Action, Actor, Resource } from "../authorization/types";
import { unauthorized, forbidden } from "./response";
import HonoAppType from "../../types/honoAppType";
import { AppDependencies } from "../services/dependencies";

export const requireActor = async (
  c: Context<HonoAppType>,
  dependencies: AppDependencies,
): Promise<{ actor: Actor } | { response: Response }> => {
  const actor = await dependencies.resolveActor(c);
  if (!actor) {
    return { response: unauthorized(c) };
  }
  c.set("actor", actor);
  return { actor };
};

export const requirePermission = (
  c: Context<HonoAppType>,
  actor: Actor,
  resource: Resource,
  action: Action,
): Response | null => {
  if (!can(actor.role, resource, action)) {
    return forbidden(c);
  }
  return null;
};
