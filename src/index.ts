import axios from 'axios';
import { waitImage } from "./waitImage";

const img = document.createElement('img');
img.width = 2;
img.height = 2;
img.style.display = 'none';
img.style.position = 'absolute';
img.style.opacity = '0';

interface postToSourceProps {
  url: string;
  analyticsData: object;
  requestTimeout: number;
  debug: boolean;
}

interface DeliverProps {
  keeperUrl?: string;
  imgUrls?: string[];
  analyticsData?: object;
  requestTimeout?: number;
  repeatInterval?: number;
  repeat?: number;
  debug?: boolean;
}

const postToSource = ({ url, analyticsData, requestTimeout, debug }: postToSourceProps) => axios(url, {
  method: 'post',
  timeout: requestTimeout,
  data: analyticsData,
})
  .then(() => {
    return url;
  })
  .catch(e => {
    if (debug) {
      console.error(`${url} timeout exceeded`, e);
    }
  });

export default async function deliver({ analyticsData = {}, keeperUrl = '', imgUrls = [], requestTimeout = 10000, repeat = 3, repeatInterval = 60000, debug = false }: DeliverProps) {
  let analyticsSent: any;
  let interval: NodeJS.Timeout;
  let currentStep = repeat;

  const run = async () => {
    currentStep--;

    if (keeperUrl) {
      analyticsSent = await postToSource({ url: keeperUrl, analyticsData, requestTimeout, debug });
    }

    if (!analyticsSent && imgUrls.length) {
      for (const url of imgUrls) {
        try {
          analyticsSent = await waitImage(img, url);
        } catch (e) {
          if (debug) {
            console.error(e);
          }
        }

        if (analyticsSent) {
          break;
        }
      }
    }

    if (analyticsSent) {
      clearInterval(interval);
      if (debug) {
        console.info(`analytics request for ${analyticsSent} was successful`);
      }
    }

    if (currentStep <= 0) {
      clearInterval(interval);
      if (!analyticsSent) {
        throw new Error(`all methods failed ${repeat} times`);
      }
    }
  };

  await run();
  if (!analyticsSent) {
    interval = setInterval(run, repeatInterval);
  }
}

