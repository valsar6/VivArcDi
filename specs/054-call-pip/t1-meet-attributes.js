(() => {
  const clip = (value, size = 60) => String(value || '').replace(/\s+/g, ' ').slice(0, size);
  const attributes = (el) => [...el.attributes].filter((a) => a.name !== 'class' && a.name !== 'style').map((a) => a.name + '=' + clip(a.value, 40));
  const leave = [...document.querySelectorAll('button')].find((button) => /esci dalla chiamata|leave call/i.test(button.getAttribute('aria-label') || ''));
  const chain = [];
  for (let el = leave; el && chain.length < 5; el = el.parentElement) {
    chain.push({ tag: el.tagName, attributes: attributes(el) });
  }
  const video = document.querySelector('video');
  const videoChain = [];
  for (let el = video; el && videoChain.length < 6; el = el.parentElement) {
    videoChain.push({ tag: el.tagName, attributes: attributes(el) });
  }
  const counts = Object.fromEntries(
    ['[data-participant-id]', '[data-self-name]', '[data-meeting-code]', '[data-call-id]', '[data-initial-participant-id]', '[jsname]'].map((selector) => [selector, document.querySelectorAll(selector).length]),
  );
  const result = JSON.stringify({ leaveFound: Boolean(leave), leaveChain: chain, videoChain, counts }, null, 2);
  try {
    copy(result);
    console.log('Copiato negli appunti. Incollalo nella chat.');
  } catch {
    console.log(result);
  }
  return result;
})();
