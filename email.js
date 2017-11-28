/* eslint no-param-reassign: 0, function-paren-newline: 0, import/no-unresolved: 0 */
/* globals $H */

const name = 'email';

const dependencies = [
  'email-validator',
  'js-htmlencode',
  'debug',
  'lodash',
].join(' ');

require('child_process').execSync(`npm i ${dependencies}`);

const log = require('debug')(`${name}:log`);
const error = require('debug')(`${name}:error`);

const checkEmail = require('email-validator').validate;
const _ = require('underscore');
const encode = require('js-htmlencode').htmlEncode;

log(`Dependencies installed: ${dependencies}`);

const renderInput = (values) => {
  values = values || {};

  return `
    <style>
      .email-list {
        resize: vertical;
      }
    </style>
    <p>Note: Duplicates email addresses aren't allowed among recipients.</p>
    <label>From:
      <span class="address-field">
        <input
          type=email
          name=fromEmail
          class="from-email"
          placeholder="e.g. harbormaster@localhost"
          disabled
          value="harbormaster@localhost"
        >
      </span>
    </label>
    <label>To (one email per line):
      <textarea
        name=toEmailList
        class="to-email-list email-list"
        placeholder="foo@bar.com\nbaz@qux.net"
        required
      >${values.toEmailList || ''}</textarea>
    </label>
    <label>CC (one email per line):
      <textarea
        name=toCCList
        class="to-cc-list email-list"
        placeholder="foo@bar.com\nbaz@qux.net"
      >${values.toCCList || ''}</textarea>
    </label>
    <label>BCC (one email per line):
      <textarea
        name=toBCCList
        class="to-bcc-list email-list"
        placeholder="foo@bar.com\nbaz@qux.net"
      >${values.toBCCList || ''}</textarea>
    </label>
    <label>Reply To (one email per line):
      <textarea
        name=replyTo
        class="to-email-list email-list"
        placeholder="foo@bar.com\nbaz@qux.net"
      >${values.replyTo || ''}</textarea>
    </label>
    <label>Subject:
      <input
        type=text
        name=subject
        class="email-subject"
        placeholder="(no subject)"
        value="${values.subject ? encode(values.subject) : ''}"
      >
    </label>
    <label>Body (raw text):
      <textarea
        name=rawText
        class="email-raw-text email-list"
        placeholder="(empty)"
        required
      >${values.rawText ? encode(values.rawText) : ''}</textarea>
    </label>
    <label>Include prior manifest?
      <input
        type=checkbox
        name=includePriorManifest
        class="include-prior-manifest"
        ${values.includePriorManifest ? 'checked' : ''}
      >
    </label>
  `;
};

const renderWorkPreview = (manifest) => {
  let priorManifestString = 'N/A';
  if (manifest.includePriorManifest && manifest.prior_manifest) {
    priorManifestString = JSON.stringify(manifest.prior_manifest, null, '\t');
  }

  return `
    <figure>
      <figcaption>An email will be sent with the following details:</figcaption>
      <p>From: <code>${manifest.fromEmail}</code></p>
      <p>To: <code>${manifest.toEmailList}</code></p>
      <p>CC: <code>${manifest.toCCList}</code></p>
      <p>BCC: <code>${manifest.toBCCList}</code></p>
      <p>Reply To: <code>${manifest.replyTo || manifest.fromEmail}</code></p>
      <p>Subject: <code>${manifest.subject}</code></p>
      <p>Body: <code>${manifest.rawText}</code></p>
      <hr>
      <p>Prior Manifest: <code>${priorManifestString}</code></p>
    </figure>
  `;
};

const register = () => name;

const checkDupes = (values) => {
  const toList = values.toEmailList.split('\n');
  const ccList = values.toCCList.length ?
    values.toCCList.split('\n') :
    [];
  const bccList = values.toBCCList ?
    values.toBCCList.split('\n') :
    [];

  if (
    _.uniq(_.flatten(_.filter(
      _.groupBy(toList, (n) => n),
      (n) => n.length > 1,
    ))).length ||
    _.uniq(_.flatten(_.filter(
      _.groupBy(ccList, (n) => n),
      (n) => n.length > 1,
    ))).length ||
    _.uniq(_.flatten(_.filter(
      _.groupBy(bccList, (n) => n),
      (n) => n.length > 1,
    ))).length
  ) {
    return false;
  }

  return true;
};

const checkBody = (values) => {
  if (values.rawText.length) return true;

  return false;
};

const update = (lane, values) => {
  if (
    //checkEmail(values.fromEmail) && checkDupes(values) && checkBody(values)
    checkDupes(values) && checkBody(values)
  ) {
    return true;
  }

  return false;
};

const work = (lane, manifest) => {
  let exitCode = 1;

  try {
    $H.Email.send({
      from: manifest.fromEmail,
      to: manifest.toEmailList.split('\n'),
      cc: manifest.toCCList.split('\n'),
      bcc: manifest.toBCCList.split('\n'),
      replyTo: manifest.replyTo.split('\n'),
      subject: manifest.subject,
      test: manifest.rawText,
    });
    exitCode = 0;
  } catch (err) {
    error(err);
    manifest.error = err;
  }

  $H.call('Lanes#end_shipment', lane, exitCode, manifest);
};

module.exports = {
  render_input: renderInput,
  render_work_preview: renderWorkPreview,
  register,
  update,
  work,
};