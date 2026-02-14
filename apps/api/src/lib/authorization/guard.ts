import { can } from "./policy";
import { Action, Actor, Resource } from "./types";

export const isSelf = (actor: Actor, targetUserId: string) =>
  actor.id === targetUserId;

export const canOrSelf = (
  actor: Actor,
  resource: Resource,
  action: Action,
  targetUserId: string,
) => {
  return can(actor.role, resource, action) || isSelf(actor, targetUserId);
};

export const canProfileUpdateField = (field: string) => {
  return field === "name" || field === "nickname" || field === "image";
};
