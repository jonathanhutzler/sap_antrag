sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/WizardStep",
    "sap/m/VBox",
    "sap/m/Text"
], function (UIComponent, History, Controller, MessageBox, WizardStep, VBox, Text) {
    "use strict";

    return Controller.extend("project1.controller.PermissionForm", {
        onInit: function () {
            this._wizard = this.byId("permissionWizard");
            this._stepUserInformation = this.byId("stepUserInformation");
            this._stepSelectPermissions = this.byId("stepSelectPermissions");
            this._additionalUserInfo = this.byId("additionalUserInfo");

            // Attach event handler for step activation
            this._wizard.attachStepActivate(this.onStepActivate.bind(this));
        },

        onNavBack: function () {
            const sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                const oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteView1", {}, true);
            }
        },

        onPermissionChange: function (oEvent) {
            const bSelected = oEvent.getSource().getSelected();
            const sText = oEvent.getSource().getText();
            const aSteps = this._wizard.getSteps();
            const oExistingStep = aSteps.find(step => step.getTitle() === sText + " Details");

            if (bSelected && !oExistingStep) {
                const oNewStep = new WizardStep({
                    title: sText + " Details",
                    content: new VBox({
                        items: [
                            new Text({ text: "Details for " + sText })
                        ]
                    })
                });
                this._wizard.addStep(oNewStep);
            } else if (!bSelected && oExistingStep) {
                this._wizard.removeStep(oExistingStep);
            }
        },

        onApplyForAnotherPersonSelect: function (oEvent) {
            const bSelected = oEvent.getSource().getSelected();
            this._additionalUserInfo.setVisible(bSelected);
        },

        onStepActivate: function (oEvent) {
            const oActivatedStep = oEvent.getParameter("step");
            if (oActivatedStep === this._stepSelectPermissions) {
                // Recalculate steps when entering the "Select Permissions" step
                this._recalculateSteps();
            }
        },

        _recalculateSteps: function () {
            // Remove all dynamically added steps
            const aSteps = this._wizard.getSteps();
            aSteps.forEach(step => {
                if (step !== this._stepUserInformation && step !== this._stepSelectPermissions) {
                    this._wizard.removeStep(step);
                }
            });

            // Re-add steps based on current selections
            const aCheckBoxes = this._stepSelectPermissions.getContent()[0].getItems();
            aCheckBoxes.forEach(checkBox => {
                if (checkBox.getSelected()) {
                    const sText = checkBox.getText();
                    const oNewStep = new WizardStep({
                        title: sText + " Details",
                        content: new VBox({
                            items: [
                                new Text({ text: "Details for " + sText })
                            ]
                        })
                    });
                    this._wizard.addStep(oNewStep);
                }
            });
        }
    });
});