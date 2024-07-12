from pyparsing import (
    Word,
    alphanums,
    printables,
    Keyword,
    Group,
    Combine,
    Forward,
    Suppress,
    OneOrMore,
    oneOf,
    ParseException,
)


def check_exact_match(self, word):
    word = word.split(".")[0]
    domain_matches = set()
    for domain in self.domains:
        if word in domain.replace(".", ""):
            domain_matches.add(domain)

    return domain_matches


class SearchQueryParser:
    def __init__(self):
        self.domains = set()
        self.matched_value = ""
        self._methods = {
            "and": self.evaluateAnd,
            "or": self.evaluateOr,
            "not": self.evaluateNot,
            "parenthesis": self.evaluateParenthesis,
            "word": self.evaluateWord,
            "startswith_word": self.GetStartsWithWord,
            "endswith_word": self.GetEndsWithWord,
        }
        self._parser = self.parser()

    def parser(self):
        operatorOr = Forward()

        operatorWord = (
            Group(Combine(Suppress("*") + Word(alphanums + ".-") + Suppress("*"))).setResultsName(
                "word"
            )
            | Group(Combine(Suppress("*") + Word(alphanums + ".-"))).setResultsName("endswith_word")
            | Group(Combine(Word(alphanums + ".-") + Suppress("*"))).setResultsName(
                "startswith_word"
            )
            | Group(Word(alphanums + ".-")).setResultsName("word")
        )

        operatorParenthesis = (
            Group(Suppress("(") + operatorOr + Suppress(")")).setResultsName("parenthesis")
            | operatorWord
        )

        operatorNot = Forward()
        operatorNot << (
            Group(Suppress(Keyword("not", caseless=True)) + operatorNot).setResultsName("not")
            | operatorParenthesis
        )

        operatorAnd = Forward()
        operatorAnd << (
            Group(
                operatorNot + Suppress(Keyword("and", caseless=True)) + operatorAnd
            ).setResultsName("and")
            | Group(
                operatorNot + OneOrMore(~oneOf("and or", caseless=True) + operatorAnd)
            ).setResultsName("and")
            | operatorNot
        )

        operatorOr << (
            Group(operatorAnd + Suppress(Keyword("or", caseless=True)) + operatorOr).setResultsName(
                "or"
            )
            | operatorAnd
        )

        return operatorOr.parseString

    def evaluateAnd(self, argument):
        return self.evaluate(argument[0]).intersection(self.evaluate(argument[1]))

    def evaluateOr(self, argument):
        return self.evaluate(argument[0]).union(self.evaluate(argument[1]))

    def evaluateNot(self, argument):
        return self.GetNot(self.evaluate(argument[0]))

    def evaluateParenthesis(self, argument):
        return self.evaluate(argument[0])

    def evaluateWord(self, argument):
        return self.GetWord(argument[0])

    def evaluateWordWildcardStart(self, argument):
        return self.GetStartsWithWord(argument[0])

    def evaluateWordWildcardEnd(self, argument):
        return self.GetEndsWithWord(argument[0])

    def evaluate(self, argument):
        return self._methods[argument.getName()](argument)

    def Parse(self, query):
        try:
            return self.evaluate(self._parser(query)[0])
        except ParseException as e:
            print(f"Error parsing query: {e}")
            return set()

    def GetWord(self, word):
        return check_exact_match(self, word)

    def GetEndsWithWord(self, word):
        return {domain for domain in self.domains if domain.split(".")[0].endswith(word[0])}

    def GetStartsWithWord(self, word):
        return {domain for domain in self.domains if domain.startswith(word[0])}

    def GetNot(self, not_set):
        return set(self.domains) - not_set


parser = SearchQueryParser()
queries = [
    "((ebanking-services.com or ibanking-services.com) and not (cleaning and service)) or google"
]


domains = []

for domain in domains:
    parser.domains = {domain}
    for query in queries:
        result = parser.Parse(query)
        if result:
            print(query.strip(), ":", result)
