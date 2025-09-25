sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], (Controller, UIComponent) => {
    "use strict";

    return Controller.extend("project1.controller.View1", {
        onInit() {
        },

        onNavToPermissionForm: function () {
            const oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("PermissionForm");
        }
    });
});