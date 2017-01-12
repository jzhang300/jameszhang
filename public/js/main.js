var $timeline,
    timeline_template = timelineTemplate.innerHTML;

function dataBind(element, template, data) {
  element.html(_.template(template, {
    items: data
  }));
}

function transition(value, maximum, start_point, end_point) {
  return value <= maximum ? start_point + (end_point - start_point) * value / maximum : end_point;
}

function transition3(value, maximum, s1, s2, s3, e1, e2, e3) {
  var r1= Math.round(transition(value, maximum, s1, e1));
  var r2= Math.round(transition(value, maximum, s2, e2));
  var r3= Math.round(transition(value, maximum, s3, e3));
  return 'rgb(' + r1 + ', ' + r2 + ', ' + r3 + ')';
}

$.when(
  $.ajax('/pages/articles')
).done(function(articles) {
  $timeline = $('.timeline');

  // 1. remove dateless posts
  var sortedArticles = articles.filter(function(item) {
    return item.meta.hasOwnProperty('date') && !item.meta.draft;
  });

  // 2. reformat posts
  sortedArticles = sortedArticles.map(function(item) {
    var date = moment(item.meta.date);
    date.date(date.date() + 1);
    return {
      url: item.uriPath,
      title: item.meta.title,
      description: item.meta.description,
      date: date.format('MMMM DD, YYYY'),
      year: date.year(),
      image: item.meta.image || null
    };
  });

  // 3. sort by date
  sortedArticles = sortedArticles.sort(function(a, b) {
    return Date.parse(b.date) > Date.parse(a.date);
  });

  // 4. group into hierarchical tree layout
  sortedArticles = sortedArticles.reduce(function(prev, cur) {
    prev[cur.year] = prev[cur.year] || [];
    prev[cur.year].push(cur);
    return prev;
  }, {});

  // 5. convert object into sorted array
  sortedArticles = Object.keys(sortedArticles).sort(function(a, b) {
    return Number.parseInt(b) > Number.parseInt(a);
  }).map(function(key) {
    return {
      year: key,
      posts: sortedArticles[key]
    };
  });

  /*
  final schema looks like this:
  [{
    year: ...,
    posts: [{
      title: ...,
      description: ...,
      date: ...,
      url: ...,
      commentsUrl: ...,
    }],
  }]
  */

  dataBind($timeline, timeline_template, sortedArticles);
  var heroPosition;
  var maximum;
  var parallax = function() {
    $('.timeline--post').each(function() {
      // reveal when scrolling down                 // reveal when scrolling up
      if (this.getBoundingClientRect().top < 600 && this.getBoundingClientRect().top > -200) {
        $(this).removeClass('timeline--post_hidden');
      }
    });
    $('.timeline--tag').each(function() {
      if (this.getBoundingClientRect().top < 600 && this.getBoundingClientRect().top > -200) {
        $(this).removeClass('timeline--tag_hidden');
      }
    });

    // maximum = $('.hero')[0].getBoundingClientRect().height;
    // heroPosition = maximum - ($('.hero')[0].getBoundingClientRect().bottom - $('.top-nav')[0].getBoundingClientRect().height);
    // console.log(maximum, heroPosition, transition3(heroPosition, maximum, 110, 209, 224, 255, 216, 168));
    // $('.hero').css(
    //   'background-color',
    //   transition3(heroPosition, maximum / 3, 110, 209, 224, 255, 209, 198)
    // );
    // $('.hero--text').css(
    //   'background-color',
    //   transition3(heroPosition, maximum / 3, 110, 209, 224, 255, 209, 198)
    // );
    // $('.blog--sun circle').css({
    //   fill: transition3(heroPosition, maximum / 3, 255, 231, 79, 255, 88, 92)
    // });
    // $('.blog--sun path').css({
    //   stroke: transition3(heroPosition, maximum / 3, 255, 222, 11, 255, 88, 92)
    // });
    // [ 0, 448 ]
    // [ #6ED1E0, #ffd8a8]
  }
  $(window).scroll(parallax);
  parallax();
});
