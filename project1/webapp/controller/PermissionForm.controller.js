sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/WizardStep",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/ui/core/Item",
    "sap/m/DatePicker",
    "sap/m/CheckBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/TextArea"
], function (UIComponent, History, Controller, MessageBox, WizardStep, VBox, Text, Item, DatePicker, CheckBox, Label, Input, TextArea) {
    "use strict";

    return Controller.extend("project1.controller.PermissionForm", {
        onInit: function () {
            this._wizard = this.byId("permissionWizard");
            this._stepUserInformation = this.byId("stepUserInformation");
            this._stepSelectPermissions = this.byId("stepSelectPermissions");
            this._additionalUserInfo = this.byId("additionalUserInfo");
            this._dateInputs = this.byId("dateInputs");
            this._startDatePicker = this.byId("startDatePicker");
            this._endDatePicker = this.byId("endDatePicker");
            this._applyForAnotherPersonCheckBox = this.byId("applyForAnotherPersonCheckBox");

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
            let oExistingStep = aSteps.find(step => step.getTitle() === sText + " Details");

            if (bSelected && !oExistingStep) {
                console.log(`Adding step for: ${sText}`);
                let oNewStepContent;
                if (sText === "Personal") {
                    oNewStepContent = new VBox({
                        items: [
                            new CheckBox({ text: "Personaleinsatz/-Entwicklung" }),
                            new CheckBox({ text: "Personalgewinnung" }),
                            new CheckBox({ text: "Personaldienst" }),
                            new CheckBox({ text: "Lehrgangsmanagement" }),
                            new CheckBox({ text: "Org.-Management" }),
                            new CheckBox({ text: "Personalhaushalt" }),
                            new CheckBox({ text: "Dozent" }),
                            new CheckBox({ text: "Bewerbersichtung" }),
                            new CheckBox({ text: "Krisenbeaftragte/r (für Stäbe)" }),
                            new CheckBox({
                                text: "Sonstiges/Konkretsierung",
                                select: this.onSonstigesSelect.bind(this)
                            }),
                            new TextArea({
                                placeholder: "Bitte konkretisieren...",
                                visible: false,
                                rows: 3,
                                id: this.createId("sonstigesInput")
                            })
                        ]
                    });
                } else {
                    oNewStepContent = new VBox({
                        items: [
                            new Text({ text: "Details for " + sText })
                        ]
                    });
                }

                const oNewStep = new WizardStep({
                    title: sText + " Details",
                    content: oNewStepContent,
                    visible: true
                });
                this._wizard.addStep(oNewStep);
            } else if (!bSelected && oExistingStep) {
                console.log(`Hiding step for: ${sText}`);
                oExistingStep.setVisible(false);
            }

            // Update the wizard's progress indicator
            this._updateWizardProgress();
        },

        onSonstigesSelect: function (oEvent) {
            const bSelected = oEvent.getSource().getSelected();
            const oInput = sap.ui.getCore().byId(this.createId("sonstigesInput"));
            if (oInput) {
                oInput.setVisible(bSelected);
            }
        },

        onApplyForAnotherPersonSelect: function (oEvent) {
            const bSelected = oEvent.getSource().getSelected();

            const aLabels = this._additionalUserInfo.getItems().filter(item => item instanceof Label);
            aLabels.forEach(label => {
                const sText = label.getText();
                if (bSelected) {
                    label.setText(sText + " (der anderen Person)");
                } else {
                    label.setText(sText.replace(" (der anderen Person)", ""));
                }
            });
        },

        onStepActivate: function (oEvent) {
            const oActivatedStep = oEvent.getParameter("step");
            if (oActivatedStep === this._stepSelectPermissions) {
                // Recalculate steps when entering the "Select Permissions" step
                this._recalculateSteps();
            }
        },

        onApplicationTypeChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const bShowDateFields = sSelectedKey !== "";
            const bShowEndDate = sSelectedKey !== "beenden";

            // Show or hide the date fields based on the selection
            this._dateInputs.setVisible(bShowDateFields);
            this._startDatePicker.setVisible(bShowDateFields);
            this._endDatePicker.setVisible(bShowDateFields && bShowEndDate);
            this.byId("dateInputs").getItems()[0].setVisible(bShowDateFields); // Label for "Ab Datum"
            this.byId("dateInputs").getItems()[2].setVisible(bShowDateFields && bShowEndDate); // Label for "Bis Datum"

            // Show the "Apply for another person" checkbox only for "Erstzulassung"
            const bShowApplyForAnotherPerson = sSelectedKey === "erstzulassung";
            this._applyForAnotherPersonCheckBox.setVisible(bShowApplyForAnotherPerson);

            // Always show the additional user information
            this._additionalUserInfo.setVisible(true);
        },

        _recalculateSteps: function () {
            // Hide all dynamically added steps
            const aSteps = this._wizard.getSteps();
            aSteps.forEach(step => {
                if (step !== this._stepUserInformation && step !== this._stepSelectPermissions) {
                    console.log(`Hiding step during recalculation: ${step.getTitle()}`);
                    step.setVisible(false);
                }
            });

            // Re-show steps based on current selections
            const aCheckBoxes = this._stepSelectPermissions.getContent()[0].getItems();
            aCheckBoxes.forEach(checkBox => {
                if (checkBox.getSelected()) {
                    const sText = checkBox.getText();
                    let oStep = aSteps.find(step => step.getTitle() === sText + " Details");
                    if (oStep) {
                        console.log(`Re-showing step for: ${sText}`);
                        oStep.setVisible(true);
                    } else {
                        console.log(`Adding step for: ${sText}`);
                        const oNewStep = new WizardStep({
                            title: sText + " Details",
                            content: new VBox({
                                items: [
                                    new Text({ text: "Details for " + sText })
                                ]
                            }),
                            visible: true
                        });
                        this._wizard.addStep(oNewStep);
                    }
                }
            });

            // Update the wizard's progress indicator
            this._updateWizardProgress();
        },

        _updateWizardProgress: function () {
            const aSteps = this._wizard.getSteps();
            const aVisibleSteps = aSteps.filter(step => step.getVisible());
            this._wizard.invalidateStep(aVisibleSteps[0]); // Refresh the wizard to update the progress indicator
        }
    });
});