import { createRoute, z } from "@hono/zod-openapi";
import {
  activityResponseSchema,
  assetUploadResponseSchema,
  createActivitySchema,
  createExhibitionSchema,
  createLinkSchema,
  createPhotographerSchema,
  deletedResponseSchema,
  exhibitionResponseSchema,
  healthResponseSchema,
  heroResponseSchema,
  idParamSchema,
  linktreeLinkResponseSchema,
  photographerGroupResponseSchema,
  photographerResponseSchema,
  sitePageResponseSchema,
  sitePageSlugParamSchema,
  updateActivitySchema,
  updateExhibitionSchema,
  updateHeroSchema,
  updateLinkSchema,
  updatePageSchema,
  updatePhotographerSchema
} from "@yonyoung/schemas";
import {
  OPENAPI_TAGS,
  badRequestResponse,
  dataEnvelopeSchema,
  forbiddenResponse,
  internalErrorResponse,
  jsonContent,
  notFoundResponse,
  unauthorizedResponse
} from "./schemas";

const adminSecurity = [{ cookieAuth: [] }];

const assetUploadFormSchema = z.object({
  entity: z.string().default("general"),
  file: z.any().openapi({
    type: "string",
    format: "binary"
  })
});

export const healthRoute = createRoute({
  method: "get",
  path: "/healthz",
  tags: [OPENAPI_TAGS.system],
  responses: {
    200: {
      description: "Health check",
      content: jsonContent(dataEnvelopeSchema(healthResponseSchema))
    }
  }
});

export const publicRoutes = {
  getHero: createRoute({
    method: "get",
    path: "/hero",
    tags: [OPENAPI_TAGS.public],
    responses: {
      200: {
        description: "Get hero settings",
        content: jsonContent(dataEnvelopeSchema(heroResponseSchema))
      },
      500: internalErrorResponse
    }
  }),
  listActivities: createRoute({
    method: "get",
    path: "/activities",
    tags: [OPENAPI_TAGS.public],
    responses: {
      200: {
        description: "List activities",
        content: jsonContent(dataEnvelopeSchema(z.array(activityResponseSchema)))
      },
      500: internalErrorResponse
    }
  }),
  getActivity: createRoute({
    method: "get",
    path: "/activities/{id}",
    tags: [OPENAPI_TAGS.public],
    request: {
      params: idParamSchema
    },
    responses: {
      200: {
        description: "Get activity",
        content: jsonContent(dataEnvelopeSchema(activityResponseSchema))
      },
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  listExhibitions: createRoute({
    method: "get",
    path: "/exhibitions",
    tags: [OPENAPI_TAGS.public],
    responses: {
      200: {
        description: "List exhibitions",
        content: jsonContent(dataEnvelopeSchema(z.array(exhibitionResponseSchema)))
      },
      500: internalErrorResponse
    }
  }),
  getExhibition: createRoute({
    method: "get",
    path: "/exhibitions/{id}",
    tags: [OPENAPI_TAGS.public],
    request: {
      params: idParamSchema
    },
    responses: {
      200: {
        description: "Get exhibition",
        content: jsonContent(dataEnvelopeSchema(exhibitionResponseSchema))
      },
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  listPhotographers: createRoute({
    method: "get",
    path: "/photographers",
    tags: [OPENAPI_TAGS.public],
    responses: {
      200: {
        description: "List photographers",
        content: jsonContent(dataEnvelopeSchema(z.array(photographerGroupResponseSchema)))
      },
      500: internalErrorResponse
    }
  }),
  listLinks: createRoute({
    method: "get",
    path: "/linktree",
    tags: [OPENAPI_TAGS.public],
    responses: {
      200: {
        description: "List linktree entries",
        content: jsonContent(dataEnvelopeSchema(z.array(linktreeLinkResponseSchema)))
      },
      500: internalErrorResponse
    }
  }),
  getPage: createRoute({
    method: "get",
    path: "/pages/{slug}",
    tags: [OPENAPI_TAGS.public],
    request: {
      params: sitePageSlugParamSchema
    },
    responses: {
      200: {
        description: "Get static page",
        content: jsonContent(dataEnvelopeSchema(sitePageResponseSchema))
      },
      404: notFoundResponse,
      500: internalErrorResponse
    }
  })
};

export const adminRoutes = {
  uploadAsset: createRoute({
    method: "post",
    path: "/assets",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: assetUploadFormSchema
          }
        }
      }
    },
    responses: {
      201: {
        description: "Upload asset",
        content: jsonContent(dataEnvelopeSchema(assetUploadResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      500: internalErrorResponse
    }
  }),
  createActivity: createRoute({
    method: "post",
    path: "/activities",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      body: {
        content: {
          "application/json": {
            schema: createActivitySchema
          }
        }
      }
    },
    responses: {
      201: {
        description: "Create activity",
        content: jsonContent(dataEnvelopeSchema(activityResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      500: internalErrorResponse
    }
  }),
  updateActivity: createRoute({
    method: "patch",
    path: "/activities/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema,
      body: {
        content: {
          "application/json": {
            schema: updateActivitySchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Update activity",
        content: jsonContent(dataEnvelopeSchema(activityResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  deleteActivity: createRoute({
    method: "delete",
    path: "/activities/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema
    },
    responses: {
      200: {
        description: "Delete activity",
        content: jsonContent(dataEnvelopeSchema(deletedResponseSchema))
      },
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  createExhibition: createRoute({
    method: "post",
    path: "/exhibitions",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      body: {
        content: {
          "application/json": {
            schema: createExhibitionSchema
          }
        }
      }
    },
    responses: {
      201: {
        description: "Create exhibition",
        content: jsonContent(dataEnvelopeSchema(exhibitionResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      500: internalErrorResponse
    }
  }),
  updateExhibition: createRoute({
    method: "patch",
    path: "/exhibitions/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema,
      body: {
        content: {
          "application/json": {
            schema: updateExhibitionSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Update exhibition",
        content: jsonContent(dataEnvelopeSchema(exhibitionResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  deleteExhibition: createRoute({
    method: "delete",
    path: "/exhibitions/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema
    },
    responses: {
      200: {
        description: "Delete exhibition",
        content: jsonContent(dataEnvelopeSchema(deletedResponseSchema))
      },
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  createPhotographer: createRoute({
    method: "post",
    path: "/photographers",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      body: {
        content: {
          "application/json": {
            schema: createPhotographerSchema
          }
        }
      }
    },
    responses: {
      201: {
        description: "Create photographer",
        content: jsonContent(dataEnvelopeSchema(photographerResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      500: internalErrorResponse
    }
  }),
  updatePhotographer: createRoute({
    method: "patch",
    path: "/photographers/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema,
      body: {
        content: {
          "application/json": {
            schema: updatePhotographerSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Update photographer",
        content: jsonContent(dataEnvelopeSchema(photographerResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  deletePhotographer: createRoute({
    method: "delete",
    path: "/photographers/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema
    },
    responses: {
      200: {
        description: "Delete photographer",
        content: jsonContent(dataEnvelopeSchema(deletedResponseSchema))
      },
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  createLink: createRoute({
    method: "post",
    path: "/linktree",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      body: {
        content: {
          "application/json": {
            schema: createLinkSchema
          }
        }
      }
    },
    responses: {
      201: {
        description: "Create linktree entry",
        content: jsonContent(dataEnvelopeSchema(linktreeLinkResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      500: internalErrorResponse
    }
  }),
  updateLink: createRoute({
    method: "patch",
    path: "/linktree/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema,
      body: {
        content: {
          "application/json": {
            schema: updateLinkSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Update linktree entry",
        content: jsonContent(dataEnvelopeSchema(linktreeLinkResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  deleteLink: createRoute({
    method: "delete",
    path: "/linktree/{id}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: idParamSchema
    },
    responses: {
      200: {
        description: "Delete linktree entry",
        content: jsonContent(dataEnvelopeSchema(deletedResponseSchema))
      },
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  updatePage: createRoute({
    method: "patch",
    path: "/pages/{slug}",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      params: sitePageSlugParamSchema,
      body: {
        content: {
          "application/json": {
            schema: updatePageSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Update page",
        content: jsonContent(dataEnvelopeSchema(sitePageResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      404: notFoundResponse,
      500: internalErrorResponse
    }
  }),
  updateHero: createRoute({
    method: "patch",
    path: "/hero",
    tags: [OPENAPI_TAGS.admin],
    security: adminSecurity,
    request: {
      body: {
        content: {
          "application/json": {
            schema: updateHeroSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Update hero",
        content: jsonContent(dataEnvelopeSchema(heroResponseSchema))
      },
      400: badRequestResponse,
      401: unauthorizedResponse,
      403: forbiddenResponse,
      500: internalErrorResponse
    }
  })
};
