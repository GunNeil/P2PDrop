import Ember from 'ember';
import AuthenticatedRouteMixin from 'simple-auth/mixins/authenticated-route-mixin';

const {
  Route,
  inject
} = Ember;

export default Route.extend(AuthenticatedRouteMixin, {
  users : inject.service("users"),
  setupController: function(controller, model, queryParams) {
    let user = this.get("users").getUser(queryParams.queryParams.email);
    if (user) {
      controller.set("user", user);
      controller.set("isAvailable", false);
      controller.set("isPending", false);
      controller.set("isConnected", false);
      controller.checkStatus();
    } else {
      controller.traverseBack();
    }
  }
});
