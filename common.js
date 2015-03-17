String.prototype.toProperCase = function () {
  return this.replace(/(?:^|\W)\S/g, function (s) { return s.toUpperCase(); });
}

Data = new Mongo.Collection('data');
Options = new Mongo.Collection('options');
Restrictions = [
  {name: 'All', days: 36524},
  {name: 'Last fortnight', days: 14},
  {name: 'Last 30 days', days: 30},
  {name: 'Last 90 days', days: 90},
  {name: 'Last year', days: 365}
]

Accounts.config({ forbidClientAccountCreation: true });

Router.route('/', function () {
  if (Meteor.userId()) this.render('_home');
  else this.render('locked');
});

Router.route('/admin', function () {
  if (Meteor.userId() && Meteor.user().profile.admin) this.render('admin');
  else this.redirect('/');
});

Router.route('/bye', function () {
  Meteor.logout();
  this.render('bye');
});

Meteor.methods({
  'addActivity': function (parentID, activityID, date) {
    var activity = Options.findOne(activityID);
    var parent = Data.findOne(parentID);
    date = new Date(date);
    var path = '';
    if (parent.path && parent.path.length > 0)
      path += parent.path + '|'
    path += parent._id;
    Data.insert({ name: activity.name, score: activity.score, date: date, type: 'activity', path: path });
  },
  'deleteActivity': function (activityID) {
    if (this.userId) {
			Data.remove(activityID);
    }
		else {
			console.log("Insufficent permissions to delete person.")
		}
  },
  'addPerson': function (name, groupingID) {
    var grouping = Data.findOne(groupingID);
    var path = '';
    if (grouping.path && grouping.path.length > 0)
      path += grouping.path + '|'
    path += grouping._id;
    Data.insert({ name: name.toProperCase(), type: 'person', path: path });
  },
  'renamePerson': function (personID, alias) {
    if (this.userId) {
      Data.update(personID, { $set: { name: alias.toProperCase() }});
    }
    else {
      console.log("Insufficient permissions to rename person.")
    }
  },
  'groupPerson': function (personID, groupingID) {
    var grouping = Data.findOne(groupingID);
    var path = '';
    if (grouping.path && grouping.path.length > 0)
      path += grouping.path + '|'
    path += grouping._id;
    Data.update(personID, { $set: { path: path }});
  },
  'deletePerson': function (personID) {
    if (this.userId) {
			Data.remove(personID);
      var rx = '.*\\|' + personID;
      Data.remove({type: 'activity', path: { $regex: rx }});
    }
		else {
			console.log("Insufficent permissions to delete person.")
		}
  }
});