# English B2 Path

An interactive, self-paced English course for upper-intermediate learners. The interface and all course materials are in English.

**App created by Ana Hernández Iranzo (AI-assisted).**

## Course contents

The course is divided into B2.1 and B2.2, with 16 grammar modules and seven vocabulary modules. Each grammar lesson includes a visual explanation, affirmative (+), negative (−) and question (?) examples, common English sentence patterns, quick checks, vocabulary, interactive practice, a short reading and speaking prompts.

Every lesson is written in English. Grammar practice includes the main lesson exercises and extra form-focused questions. The past-tense lesson adds a grouped reference table of common irregular verbs, practice questions, a visual timeline and the three pronunciations of regular -ed endings, with American English audio.

### Grammar

- Present perfect and past simple
- Narrative tenses
- Future forms
- Present perfect continuous
- Relative clauses
- Articles, determiners and quantifiers
- Comparatives, superlatives and emphasis
- Gerunds and infinitives
- Conditionals and wishes
- Modal verbs for deduction and obligation
- Passive forms and have something done
- Reported speech
- Inversion and emphasis
- Participle clauses
- Phrasal verbs and verb patterns
- Modal perfects

### Vocabulary

- Work and careers
- Education and learning
- Technology and media
- The environment
- Health and lifestyle
- Travel and culture
- Society and relationships

Theory also includes an English sentence toolkit covering statements, negatives, yes/no and wh- questions, subject and indirect questions, question tags, imperatives, suggestions, exclamations and conditionals.

## Features

- Interactive multiple-choice, gap-fill, word-order, and vocabulary practice
- Reading comprehension and text-to-speech audio
- American English speech output and speech-recognition language
- Speaking prompts with optional browser speech recognition
- XP, daily streaks, module results, and a course test
- Open-access and progressive-unlock modes
- Progress export and import; progress stays in the learner's browser
- Responsive layout; no installation or build step required

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static web server. Microphone access for speech recognition may require `localhost` or HTTPS.

## Publish with GitHub Pages

1. Push this project to the `main` branch of `Curiousminds123/inglesb2`.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, then select `main` and `/(root)`.
4. The site will be available at `https://Curiousminds123.github.io/inglesb2/` after Pages finishes deploying.

## Project structure

```text
index.html            App shell and script loading
css/styles.css        Responsive interface styles
js/app.js             Navigation, practice, progress and browser audio
data/levels.js        Course level metadata
data/grammar.js       Core B2.1 and B2.2 grammar modules
data/grammar-extension.js Additional grammar modules and form-focused practice
data/irregular-verbs.js  Past-tense irregular verb reference and practice
data/vocabulary.js    Seven vocabulary modules split across B2.1 and B2.2
assets/img/           App icon and course illustrations
```

## Privacy and attribution

There is no account or server-side tracking. Course progress is stored in the browser's local storage. Speech features use the browser's Web Speech API.

App created by Ana Hernández Iranzo (AI-assisted).
