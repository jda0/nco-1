Accounts.ui.config({ passwordSignupFields: 'USERNAME_ONLY' });

Meteor.subscribe('data');
Meteor.subscribe('options');

Session.setDefault('node', null);
Session.setDefault('restriction', {});
Session.setDefault('rankings', []);

Handlebars.registerHelper('admin', function () { return Meteor.user() ? Meteor.user().profile.admin : false; });

Template.add.helpers({
  date: function () {
    return new Date().toISOString().split('T')[0];
  },
  people: function () {
    return Data.find({ $or: [{ type: 'person' }, { type: 'grouping' }]}, { sort: { type: -1 }});
  },
  parent: function () {
    var aid = this.path.split('|');
    var id = aid[aid.length - 1];
    return Data.findOne(id).name;
  },
  options: function () {
    return Options.find();
  },
  isGrouping: function () {
    return this.type === 'grouping';
  },
  isPerson: function () {
    return this.type === 'person';
  }
});

Template.add.events({
  'click .add': function (e, template) {
    Meteor.call('addActivity',
      template.find('.people').value,
      template.find('.options').value,
      template.find('.cdate').value);
  }
});

Template.actions.helpers({
  people: function () {
    return Data.find({type: 'person'});
  },
  parent: function () {
    var aid = this.path.split('|');
    var id = aid[aid.length - 1];
    return Data.findOne(id).name;
  },
  groupings: function () {
    return Data.find({type: 'grouping'});
  },
  notNobody: function () {
    return Data.find({type: 'person'}).count() > 0;
  }
});

Template.actions.events({
	'click .addp': function (e, template) {
		Meteor.call('addPerson', template.find('.aname').value, template.find('.agrp').value);
	},
  'click .rnp': function (e, template) {
    Meteor.call('renamePerson', template.find('.rname').value, template.find('.ralias').value);
  },
	'click .movep': function (e, template) {
		Meteor.call('groupPerson', template.find('.ename').value, template.find('.egrp').value);
	},
	'click .delp': function (e, template) {
		Meteor.call('deletePerson', template.find('.ename').value);
	}
});

Template.level.helpers({
  level: function () {
    return Session.get('node');
  },
  shortFormat: function (date) {
    if (date) {
      var date2 = new Date(date);
      return date2.getDate() + '/' + (date2.getMonth() + 1) + '/' + date2.getFullYear() + '&emsp;';
    }
    else return '';
  },
  isActivity: function () {
    return this.type === 'activity';
  },
  isntActivity: function () {
     return this.type !== 'activity'; 
  }
});

Template.level.events({
  'click .clickbait': function () {
    var d = d3.select('[data-id="' + this._id + '"]');
    d.on('click')(d.datum());
  },
  'click .up': function () {
    if (this.parent) {
      var d = d3.select('[data-id="' + this.parent + '"]');
      d.on('click')(d.datum());
    }
  },
  'click .delete': function () {
    Meteor.call('deleteActivity', this._id);
  }
});

Template.ranks.helpers({
  people: function () {
    return Session.get('rankings');
  }
})

Template.restrict.helpers({
  options: function () {
    return Restrictions;
  }
});

Template.restrict.events({
  'change': function (e) {
    var then = new Date();
    then = new Date(then.setDate(then.getDate() - Restrictions[e.target.selectedIndex].days));
    Session.set('restriction', { $or: [{ date: { $exists: false }}, { date: { $gte: then }}] });
  }
});

Template.recent.helpers({
  recent: function () {
    return Data.find({type: 'activity'}, { sort: { date: -1 } });
  },
  person: function () {
    var aid = this.path.split('|');
    var id = aid[aid.length - 1];
    return Data.findOne(id).name;
  },
  shortFormat: function (date) {
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
  }
});

Template.recent.events({
  'click .delete': function () {
    Meteor.call('deleteActivity', this._id);
  }
})

Template.diagram.rendered = function () {
  _.defer(function () {
    var width = 560,
        height = 560,
        radius = Math.min(width, height) / 2.2;

    var x = d3.scale.linear()
        .range([0, 2 * Math.PI]);

    var y = d3.scale.sqrt()
        .range([0, radius]);

    var color = d3.scale.ordinal()
        .range(["#FFFFFF", "#4DB6AC", "#64B5F6", "#4DD0E1", "#7986CB", "#4FC3F7"]);

    var svg = d3.select("#diagram")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var partition = d3.layout.partition()
        .sort(function (a, b) { 
          if (a.type === 'activity' && b.type === 'activity') return b.score - a.score;
          else if (a.type !== 'activity' && b.type === 'activity') return -1;
          else if (a.type === 'activity' && b.type !== 'activity') return 1;
          else return 0;
        })
        .value(function (d) { return Math.abs(d.score) + 10; });

    var arc = d3.svg.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

    // Keep track of the node that is currently being displayed as the root.
    var node, init = false;

    var update = function () {
      var restriction = Session.get('restriction');
      var root = fixLeaves(makeTree(Data.find(restriction).fetch()))[0];

      if (root !== undefined) {
        if (!init)
          node = root;
        init = true;
        svg.datum(root).selectAll("path").remove();
        
        var path = svg.datum(root).selectAll("path")
        .data(partition.nodes);

        path.enter()
        .append("path")
        .attr("data-id", function (d) { return d._id; })
        .attr("d", arc)
        .style("fill", function(d) {
          if (d.type === 'activity')
            return d.color = (d.score < 0 ? '#E57373' : '#AED581');
          else if (d.score < 0 && (!d.parent.parent || (d.parent.parent && d.parent.score >= 0)))
            return d.color = '#F06292';
          else if (d.parent && d.parent.color && (d.parent.score >= 0 || (d.parent.score < 0 && d.score < 0)))
              return d.color = d3.rgb(d.parent.color).brighter(0.25).toString();
          else if (d.parent && d.parent.parent)
              return d.color = d3.rgb(color(d.parent.parent.name)).brighter(0.25).brighter(0.25).toString();
          else
            return d.color = color(d.name);
        })
        .on("click", click)
        .each(stash);

        path.exit()
        .remove();

        path.transition()
        .duration(1000)
        .attrTween("d", arcTweenData);

        function click (d) {
          node = d;
          path.transition()
          .duration(1000)
          .attrTween("d", arcTweenZoom(d));

          var npath = d._id;
          var pnode = d;
          while (pnode.parent) {
            pnode = pnode.parent;
            npath = pnode._id + '|'
          }
          
          Session.set('rankings', getTop(node, 3));
          
          Session.set('node', {
            _id: d._id, name: d.name, type: d.type, score: d.score, color: d.color,
            parent: d.parent ? d.parent._id : null, children: _.map(d.children, function (c) {
              return {_id: c._id, name: c.name, type: c.type, score: c.score, date: c.date, color: c.color}
            })
          });
        }
        
        var getTop = function (d, n) {
          var p = [];
          
          function r (c) {
            if (c.children && c.type !== 'person') {
              _.each(c.children, function (i) {
                if (i.type === 'person') p.push({ _id: i._id, name: i.name, parentScore: i.parent.score, score: i.score, derivedScore: i.score + Math.ceil(i.parent.score * 0.05), color: d3.rgb(i.color).darker(0.7).toString() });
                else if (i.children) r(i);
              });
            }
          }
          
          r(d);
          return p.sort(function (a, b) { var t = b.derivedScore - a.derivedScore; return t === 0 ? b.score - a.score : t; }).slice(0, n);
        }
        
        var pnode = node, npath = [pnode._id], node2, cid;
        while (pnode.parent) {
          pnode = pnode.parent;
          npath.push(pnode._id);
        }
        node = root;
        while (npath.length > 0 && node.children) {
          cid = npath.pop();
          node2 = _.find(node.children, function (d) { return d._id === cid; });
          if (node2 !== undefined) node = node2;
        }
        
        click(node);
      }
    };
    Deps.autorun(update);

    d3.select(self.frameElement).style("height", height + "px");

    // Setup for switching data: stash the old values for transition.
    function stash(d) {
      d.x0 = isNaN(d.x) ? 0 : d.x;
      d.dx0 = isNaN(d.dx) ? 0 : d.dx;
    }

    // When switching data: interpolate the arcs in data space.
    function arcTweenData(a, i) {
      var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
      function tween(t) {
        var b = oi(t);
        a.x0 = b.x;
        a.dx0 = b.dx;
        return arc(b);
      }
      if (i == 0) {
       // If we are on the first arc, adjust the x domain to match the root node
       // at the current zoom level. (We only need to do this once.)
        var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
        return function(t) {
          x.domain(xd(t));
          return tween(t);
        };
      } else {
        return tween;
      }
    }

    // When zooming: interpolate the scales.
    function arcTweenZoom(d) {
      var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
          yd = d3.interpolate(y.domain(), [d.y, 1]),
          yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
      return function(d, i) {
        return i
            ? function(t) { return arc(d); }
            : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
      };
    }
  });
};

var makeTree = (function() {
  var defaultClone = function(record) {
    var newRecord = JSON.parse(JSON.stringify(record));
    delete newRecord.path;
    return newRecord;
  };
  return function(flat, clone) {
    return flat.reduce(function(data, record) {
      var oldRecord = data.catalog[record._id];
      var newRecord = (clone || defaultClone)(record);
      if (oldRecord && oldRecord.children) {
        newRecord.children = oldRecord.children;
      }
      data.catalog[record._id] = newRecord;
      var path = record.path.valueOf().split('|');
      var pathEnd = path[0].length > 0 ? path[path.length - 1] : null;
      if (pathEnd) {
        var parent = data.catalog[pathEnd] = 
              (data.catalog[pathEnd] || {_id: pathEnd});
        (parent.children = parent.children || []).push(newRecord);
      } else {
        data.tree.push(newRecord);
      }
        return data;
    }, {catalog: {}, tree: []}).tree;
  }
}());

var fixLeaves = function (tree) {
  var r = function (b) {
    if (b.children)
      b.children.forEach(function (c) {
        r(c); 
        if (c.children) {
          c.score = _.reduce(c.children, function (x, y) { return x + y.score; }, 0);
        }
      });
    else if (!b.score)
      b.score = 0; 
  }
  tree.forEach(function (c) { r(c); });
  return tree;
};