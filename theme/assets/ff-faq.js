(function () {
  try {
    var root = document.querySelector('.ff-faq');
    if (!root) return;

    var topics = Array.prototype.slice.call(root.querySelectorAll('[data-ff-faq-topic]'));
    var groups = Array.prototype.slice.call(root.querySelectorAll('[data-ff-faq-group]'));
    if (!topics.length || !groups.length) return;

    function setTopic(topicId) {
      topics.forEach(function (el) {
        el.classList.toggle('is-active', el.getAttribute('data-ff-faq-topic') === topicId);
      });
      groups.forEach(function (group) {
        var show = topicId === 'all' || group.getAttribute('data-ff-faq-group') === topicId;
        group.classList.toggle('is-hidden', !show);
      });
    }

    topics.forEach(function (el) {
      el.addEventListener('click', function (event) {
        var topicId = el.getAttribute('data-ff-faq-topic');
        if (!topicId) return;
        if (topicId === 'all') {
          event.preventDefault();
          setTopic('all');
          return;
        }
        // Allow hash jump, but still filter to that category.
        setTopic(topicId);
      });
    });
  } catch (e) {}
})();
