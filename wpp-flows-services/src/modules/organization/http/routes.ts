import { OrganizationController } from "./controllers/organization-controller";
import { TemplateVariablesController } from "./controllers/template-variables-controller";

export const organizationRoutes = [
    new OrganizationController(),
    new TemplateVariablesController(),
];
