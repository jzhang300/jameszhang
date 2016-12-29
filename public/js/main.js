var $timeline,
    timeline_template = timelineTemplate.innerHTML;

function dataBind(element, template, data) {
  element.html(_.template(template, {
    items: data
  }));
}

$.when(
  $.ajax('/pages/articles')
).done(function(articles) {
  $timeline = $('.timeline');

  // 1. remove dateless posts
  var sortedArticles = articles.filter(function(item) {
    return item.meta.hasOwnProperty('date');
  });

  // 2. reformat posts
  sortedArticles = sortedArticles.map(function(item) {
    var date = moment(item.meta.date);
    date.date(date.date() + 1);
    return {
      url: item.uriPath,
      title: item.meta.title,
      description: item.meta.description,
      date: date.format('MM/DD/YYYY'),
      year: date.year()
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

  $(window).scroll(function() {
    $('.timeline--post').each(function() {
      if (this.getBoundingClientRect().top < 400 && this.getBoundingClientRect().top > -200) {
        $(this).removeClass('timeline--post_hidden');
      }
    });
    $('.timeline--tag').each(function() {
      if (this.getBoundingClientRect().top < 400 && this.getBoundingClientRect().top > -200) {
        $(this).removeClass('timeline--tag_hidden');
      }
    });
  });
});
