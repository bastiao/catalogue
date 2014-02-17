from questionnaire import *
from questionnaire import Processors, QuestionProcessors
from django.utils.translation import ugettext as _

from questionnaire import *
from django.utils.translation import ugettext as _
from django.utils.simplejson import dumps

@question_proc('stackable')
def question_(request, question):
    cd = question.getcheckdict()
    
    key = "question_%s" % question.number
    value = question.getcheckdict().get('default','')

    print question
    print "HERE REQUEST!!!!!!!!!" +value

    if key in request.POST:
        value = request.POST[key]
        print "REQUEST!!!!" + value
    return {
        'required' : question.getcheckdict().get('required', False),
        'value' : value,
        'template' : 'questionnaire/stackable.html',
    }


@answer_proc('stackable')
def process_(question, ansdict):
    checkdict = question.getcheckdict()
    required = question.getcheckdict().get('required', 0)
    ans = ansdict['ANSWER'] or ''
    qtype = question.get_type()


    print "HERE Process!!!!!!!!" +ans

    #if len(ans)!=0 and not ans.isdigit():
     #   raise AnswerException(_(u'Must be a mumeric field. ex: 1000000000 = 1 Million'))

    if ansdict.has_key('comment') and len(ansdict['comment']) > 0:
        return dumps([ans, [ansdict['comment']]])
    if ans:
        return dumps([ans])
    return dumps([])

add_type('stackable', 'Stackable')
