Meteor.startup(function () {
  if (Meteor.users.find().count() === 0) {
    Accounts.createUser({
      username: 'admin',
      password: 'TornadoGR4',
      profile: { admin: true }
    });
    
    Accounts.createUser({
      username: 'cadet',
      password: '723sqn',
      profile: {}
    });
  }
  
  if (Options.find().count() === 0) {
    aopt = [
      {name: 'Cadet of the Month', score: 20},
      {name: 'Nomination', score: 5},
      {name: 'Representing Squadron', score: 5},
      {name: 'Representing Wing', score: 10},
      {name: 'Representing Region', score: 15},
      {name: 'Representing Corps', score: 20},
      {name: 'Visible Improvement', score: 10},
      {name: 'Activity', score: 50},
      {name: 'Activity', score: 40},
      {name: 'Activity', score: 30},
      {name: 'Activity', score: 25},
      {name: 'Activity', score: 20},
      {name: 'Activity', score: 15},
      {name: 'Activity', score: 10},
      {name: 'Activity', score: 5},
      {name: 'Activity', score: 4},
      {name: 'Activity', score: 3},
      {name: 'Activity', score: 2},
      {name: 'Activity', score: 1},
      {name: 'Inspection: 10', score: 5},
      {name: 'Inspection: 9', score: 4},
      {name: 'Inspection: 8', score: 3},
      {name: 'Inspection: 7', score: 2},
      {name: 'Inspection: 6', score: 1},
      {name: 'Inspection: <5', score: -1},
      {name: 'Incorrect Equipment', score: -5},
      {name: 'Incorrect Uniform', score: -5},
      {name: 'Warning (Poor Behavior)', score: -5},
      {name: 'Report Book', score: -10},
      {name: 'Consistent Poor Uniform', score: -10},
      {name: 'Repeated Offence', score: -5}
    ];
    
    _.each(aopt, function (o) {
      Options.insert({
        name: o.name,
        score: o.score
      });
    });
  }
  
  if (Data.find().count() === 0) {
    var groupings = [{name: 'Squadron', children: [
      {name: 'Merlin', children: [
        {name: 'Griffin'}, {name: 'Lynx'}
      ]}, {name: 'Vulcan', children: [
        {name: 'Jaguar'}, {name: 'Harrier'}
      ]}
    ]}];
    r(groupings, '');
  }
  
  function r(o, path) {
    _.each(o, function (g) {
      var id = Random.id()
      var type = path === '' ? '_top' : 'grouping'
          
      Data.insert({
        _id: id,
        name: g.name,
        path: path,
        type: type
      });
      
      var path2 = path;
      if (path2 !== '')
        path2 += '|'
      path2 += id;
      if (g.children)
        r(g.children, path2);
    });
  }
});

Meteor.publish('data', function() {
  if (this.userId) {
    return Data.find();
  }
});

Meteor.publish('options', function () {
  return Options.find();
});