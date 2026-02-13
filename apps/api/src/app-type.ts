import { OpenAPIHono } from "@hono/zod-openapi";
import { adminRoutes, healthRoute, publicRoutes } from "./openapi/routes";

const noopHandler = (() => new Response(null, { status: 200 })) as never;

const publicContract = new OpenAPIHono()
  .openapi(publicRoutes.getHero, noopHandler)
  .openapi(publicRoutes.listActivities, noopHandler)
  .openapi(publicRoutes.getActivity, noopHandler)
  .openapi(publicRoutes.listExhibitions, noopHandler)
  .openapi(publicRoutes.getExhibition, noopHandler)
  .openapi(publicRoutes.listPhotographers, noopHandler)
  .openapi(publicRoutes.listLinks, noopHandler)
  .openapi(publicRoutes.getPage, noopHandler);

const adminContract = new OpenAPIHono()
  .openapi(adminRoutes.uploadAsset, noopHandler)
  .openapi(adminRoutes.createActivity, noopHandler)
  .openapi(adminRoutes.updateActivity, noopHandler)
  .openapi(adminRoutes.deleteActivity, noopHandler)
  .openapi(adminRoutes.createExhibition, noopHandler)
  .openapi(adminRoutes.updateExhibition, noopHandler)
  .openapi(adminRoutes.deleteExhibition, noopHandler)
  .openapi(adminRoutes.createPhotographer, noopHandler)
  .openapi(adminRoutes.updatePhotographer, noopHandler)
  .openapi(adminRoutes.deletePhotographer, noopHandler)
  .openapi(adminRoutes.createLink, noopHandler)
  .openapi(adminRoutes.updateLink, noopHandler)
  .openapi(adminRoutes.deleteLink, noopHandler)
  .openapi(adminRoutes.updatePage, noopHandler)
  .openapi(adminRoutes.updateHero, noopHandler);

const contractApp = new OpenAPIHono()
  .openapi(healthRoute, noopHandler)
  .route("/v1/public", publicContract)
  .route("/v1/admin", adminContract);

export type ApiAppType = typeof contractApp;
