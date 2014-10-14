from django.db import models
from transmeta import TransMeta
from django.utils.translation import ugettext_lazy as _
from questionnaire import QuestionChoices
from searchengine.models import Slugs
import re
from utils import split_numal
from django.utils import simplejson as json
from parsers import parse_checks, ParseException
from django.conf import settings
from django.contrib.auth.models import User

_numre = re.compile("(\d+)([a-z]+)", re.I)

class Questionnaire(models.Model):
    name = models.CharField(max_length=128)
    redirect_url = models.CharField(max_length=128, help_text="URL to redirect to when Questionnaire is complete. Macros: $SUBJECTID, $RUNID, $LANG", default="/static/complete.html")
    slug = models.CharField(max_length=128)
    disable = models.CharField(max_length=128)

    def __unicode__(self):
        return self.name

    def questionsets(self):
        if not hasattr(self, "__qscache"):
            self.__qscache = \
              QuestionSet.objects.filter(questionnaire=self).order_by('sortid')
        return self.__qscache

    def questions(self):
        if not hasattr(self, "__questionscache"):
            questions = []

            qsets = self.questionsets()

            for qset in qsets:
                questions = questions + qset.questions()

            self.__questionscache = questions

        return self.__questionscache

    def findMandatoryQs(self):
        if not hasattr(self, "__mandatoryqscache"):
            self.__mandatoryqscache = None
            try:
                name = Question.objects.get(questionset__questionnaire=self, slug_fk__slug1="database_name")

                self.__mandatoryqscache = name.questionset

            except Question.DoesNotExist:
                print "does not exist question database_name"
                pass
        return self.__mandatoryqscache
    def copy(self):
        def __firstSlugFree(slug):
            i=2
            # if there's more than 100 copies, there's probably something wrong...
            while i < 100:
                try:
                    quest = Questionnaire.objects.get(slug=(slug+str(i)))
                except Questionnaire.DoesNotExist:
                        return str(i)
                i+=1

            return None

        clone = Questionnaire()

        clone.__dict__ = self.__dict__.copy()

        new_slug = __firstSlugFree(clone.slug)

        if new_slug != None:
            clone.id = None

            clone.slug = clone.slug+new_slug
            clone.name = clone.name+" "+new_slug
            clone.save()

            for questionset in self.questionsets():
                questionset.copy(clone)

            return clone

        else:
            print "-- Can't clone questionnaire safely."
            return None


    class Meta:
        permissions = (
            ("export", "Can export questionnaire answers"),
            ("management", "Management Tools")
        )

class QuestionSet(models.Model):
    __metaclass__ = TransMeta

    "Which questions to display on a question page"
    questionnaire = models.ForeignKey(Questionnaire)
    # TODO
    # questionnaire = models.ManyToManyField(Questionnaire)
    sortid = models.IntegerField() # used to decide which order to display in
    heading = models.CharField(max_length=255)
    checks = models.CharField(max_length=128, blank=True,
    help_text = """Current options are 'femaleonly' or 'maleonly' and shownif="QuestionNumber,Answer" which takes the same format as <tt>requiredif</tt> for questions.""")
    text = models.TextField(help_text="This is interpreted as Textile: <a href='http://hobix.com/textile/quick.html'>http://hobix.com/textile/quick.html</a>")
    help_text = models.CharField(max_length=2255, blank=True, null=True)
    tooltip = models.BooleanField(default=False, help_text="If help text appears in a tooltip")

    def questions(self):
        if not hasattr(self, "__qcache"):
            self.__qcache = list(Question.objects.filter(questionset=self).order_by('number'))
            self.__qcache.sort()
        return self.__qcache

    # Returns the serverside total and filled count for this questionset
    def total_count(self):
        if not hasattr(self, "__qcache"):
            self.__qcache = list(Question.objects.filter(questionset=self).order_by('number'))
            self.__qcache.sort()

        questions = self.__qcache

        return len(questions);

    def next(self):
        qs = self.questionnaire.questionsets()
        retnext = False
        for q in qs:
            if retnext:
                return q
            if q == self:
                retnext = True
        return None

    def prev(self):
        qs = self.questionnaire.questionsets()
        last = None
        for q in qs:
            if q == self:
                return last
            last = q

    def is_last(self):
        try:
            return self.questionnaire.questionsets()[-1] == self
        except NameError:
            # should only occur if not yet saved
            return True

    def is_first(self):
        try:
            return self.questionnaire.questionsets()[0] == self
        except NameError:
            # should only occur if not yet saved
            return True
    def copy(self, questionnaire):
        clone = QuestionSet()

        clone.__dict__ = self.__dict__.copy()

        clone.id = None
        clone.questionnaire = questionnaire

        clone.save()

        for question in self.questions():
            question.copy(clone)

        return clone

    def __unicode__(self):
        return u'%s: %s' % (self.questionnaire.name, self.heading)

    class Meta:
        translate = ('text',)

VISIBILITY_CHOICES = (
    (0, 'public'),
    (1, 'private')
)
### This models, keeps the permissions for a questionset, relative to a fingerprint
class QuestionSetPermissions(models.Model):

    id = models.AutoField(primary_key=True)
    fingerprint_id = models.CharField(max_length=32)
    qs = models.ForeignKey(QuestionSet)
    visibility = models.IntegerField(choices=VISIBILITY_CHOICES)
    allow_printing = models.BooleanField(default=True)
    allow_indexing = models.BooleanField(default=True)
    allow_exporting = models.BooleanField(default=True)



class Question(models.Model):
    __metaclass__ = TransMeta

    questionset = models.ForeignKey(QuestionSet)
    number = models.CharField(max_length=255, help_text=
        "eg. <tt>1</tt>, <tt>2a</tt>, <tt>2b</tt>, <tt>3c</tt><br /> "
        "Number is also used for ordering questions.")
    text = models.TextField(blank=True)
    type = models.CharField(u"Type of question", max_length=32,
        choices = QuestionChoices,
        help_text = u"Determines the means of answering the question. " \
        "An open question gives the user a single-line textfield, " \
        "multiple-choice gives the user a number of choices he/she can " \
        "choose from. If a question is multiple-choice, enter the choices " \
        "this user can choose from below'.")
    extra = models.CharField(u"Extra information", max_length=128, blank=True, null=True, help_text=u"Extra information (use  on question type)")
    checks = models.CharField(u"Additional checks", max_length=128, blank=True,
        null=True, help_text="Additional checks to be performed for this "
        "value (space separated)  <br /><br />"
        "For text fields, <tt>required</tt> is a valid check.<br />"
        "For yes/no choice, <tt>required</tt>, <tt>required-yes</tt>, "
        "and <tt>required-no</tt> are valid.<br /><br />"
        "If this question is required only if another question's answer is "
        'something specific, use <tt>requiredif="QuestionNumber,Value"</tt> '
        'or <tt>requiredif="QuestionNumber,!Value"</tt> for anything but '
        "a specific value.  "
        "You may also combine tests appearing in <tt>requiredif</tt> "
        "by joining them with the words <tt>and</tt> or <tt>or</tt>, "
        'eg. <tt>requiredif="Q1,A or Q2,B"</tt>')
    footer = models.TextField(u"Footer", help_text="Footer rendered below the question interpreted as textile", blank=True)
    slug = models.CharField(max_length=128)
    slug_fk = models.ForeignKey(Slugs, blank=True, null=True)
    help_text = models.CharField(max_length=2255, blank=True, null=True)
    stats = models.BooleanField(default=False)
    category = models.BooleanField(default=False)
    tooltip = models.BooleanField(default=False, help_text="If help text appears in a tooltip")
    visible_default = models.BooleanField(u"Comments visible by default", default=False)

    def questionnaire(self):
        return self.questionset.questionnaire

    def getcheckdict(self):
        """getcheckdict returns a dictionary of the values in self.checks"""
        if(hasattr(self, '__checkdict_cached')):
            return self.__checkdict_cached
        try:
            self.__checkdict_cached = d = parse_checks(self.sameas().checks or '')
        except ParseException:
            raise Exception("Error Parsing Checks for Question %s: %s" % (
                self.number, self.sameas().checks))
        return d

    def __unicode__(self):
        return u'{%s} (%s) %s' % (unicode(self.questionset), self.number, self.text)

    def sameas(self):
        if self.type == 'sameas':
            try:
                self.__sameas = res = getattr(self, "__sameas",
                    Question.objects.get(number=self.checks,
                        questionset__questionnaire=self.questionset.questionnaire))
                return res
            except Question.DoesNotExist:
                return Question(type='comment') # replace with something benign
        return self

    def display_number(self):
        "Return either the number alone or the non-number part of the question number indented"
        # m = _numre.match(self.number)
        # if m:
        #     sub = m.group(2)
        #     return "&nbsp;&nbsp;&nbsp;" + sub
        return self.number

    def choices(self):
        if self.type == 'sameas':
            return self.sameas().choices()
        res = Choice.objects.filter(question=self).order_by('sortid')
        return res

    def is_custom(self):
        return "custom" == self.sameas().type

    def get_type(self):
        "Get the type name, treating sameas and custom specially"
        t = self.sameas().type
        if t == 'custom':
            cd = self.sameas().getcheckdict()
            if 'type' not in cd:
                raise Exception("When using custom types, you must have type=<name> in the additional checks field")
            return cd.get('type')
        return t

    def questioninclude(self):
        return "questionnaire/" + self.get_type() + ".html"

    def copy(self, questionset):
        clone = Question()

        clone.__dict__ = self.__dict__.copy()

        clone.id = None
        clone.questionset = questionset

        clone.save()

        return clone

    def __cmp__(a, b):
        anum, astr = split_numal(a.number)
        bnum, bstr = split_numal(b.number)
        cmpnum = cmp(anum, bnum)
        return cmpnum or cmp(astr, bstr)

    class Meta:
        translate = ('text', 'extra', 'footer')




class Choice(models.Model):
    __metaclass__ = TransMeta

    question = models.ForeignKey(Question)
    sortid = models.IntegerField()
    value = models.CharField(u"Short Value", max_length=1000)
    text = models.CharField(u"Choice Text", max_length=2000)

    def __unicode__(self):
        return u'(%s) %d. %s' % (self.question.number, self.sortid, self.text)

    class Meta:
        translate = ('text',)
