const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Converts a time string (e.g., "1:23:45", "12:34") into the total number of seconds.
 * @param {string} timeStr - The time string to convert.
 * @returns {number} - The total number of seconds.
 */
function timeStringToSeconds(timeStr) {
  const timeParts = timeStr.split(':').map(Number);
  let seconds = 0;

  if (timeParts.length === 3) {
    seconds += timeParts[0] * 3600; // hours to seconds
    seconds += timeParts[1] * 60;   // minutes to seconds
    seconds += timeParts[2];        // seconds
  } else if (timeParts.length === 2) {
    seconds += timeParts[0] * 60;   // minutes to seconds
    seconds += timeParts[1];        // seconds
  }

  return seconds;
}

/**
 * Converts a total number of seconds into a time string (e.g., "1:23:45").
 * @param {number} totalSeconds - The total number of seconds.
 * @returns {string} - The formatted time string.
 */
function secondsToTimeString(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Scrolls the page to the bottom to load more videos.
 * @param {object} page - The Puppeteer page object.
 * @param {number} scrollDelay - The delay between scrolls in milliseconds.
 */
async function autoScroll(page, scrollDelay = 1000) {
  await page.evaluate(async (scrollDelay) => {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollStep = window.innerHeight;
    let totalHeight = 0;

    while (totalHeight < scrollHeight) {
      window.scrollBy(0, scrollStep);
      totalHeight += scrollStep;
      await new Promise(resolve => setTimeout(resolve, scrollDelay));
    }
  }, scrollDelay);
}

/**
 * Fetches all video details from a YouTube playlist.
 * @param {string} playlistId - The ID of the YouTube playlist.
 * @returns {Promise<Object | null>} - An object containing the video count, total duration, and an array of video details.
 */
async function getAllVideoDetails(playlistId) {
  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Navigate to the playlist URL
    await page.goto(playlistUrl, { waitUntil: 'networkidle2' });
    // Scroll to the bottom to load all videos
    await autoScroll(page);
    // Wait for the video elements to load
    await page.waitForSelector('ytd-playlist-video-renderer', { timeout: 60000 });
    // Extract all video details and video count
    const playlistDetails = await page.evaluate(() => {
      const videoElements = document.querySelectorAll('ytd-playlist-video-renderer');
      const videoCount = videoElements.length;
      const videos = Array.from(videoElements).map((video) => {
        const titleElement = video.querySelector('a#video-title');
        const title = titleElement ? titleElement.textContent.trim() : null;
        const videoHref = titleElement ? titleElement.getAttribute('href') : null;
        const videoId = videoHref ? new URL(videoHref, 'https://www.youtube.com').searchParams.get('v') : null;
        const durationElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
        const duration = durationElement ? durationElement.textContent.trim() : null;
        const dateElement = video.querySelector('div#metadata-line span:nth-child(2)');
        const date = dateElement ? dateElement.textContent.trim() : null;
        const thumbnail = videoId ? `http://img.youtube.com/vi/${videoId}/sddefault.jpg` : null;
        return {
          'عنوان': title,
          'معرف الفيديو': videoId,
          'صورة مصغرة': thumbnail,
          'رابط': videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
          'مدة': duration,
          'تاريخ': date
        };
      });
      return {
        'عدد الفيديوهات': videoCount,
        'الفيديوهات': videos,
        'تاريخ أول حلقة': videos.length > 0 ? videos[0]['تاريخ'] : null,
        'رابط أول فيديو': videos.length > 0 ? videos[0]['رابط'] : null
      };
    });

    // Navigate to the first video URL to get the date
    if (playlistDetails['رابط أول فيديو']) {
      await page.goto(playlistDetails['رابط أول فيديو'], { waitUntil: 'networkidle2' });
      const firstVideoDate = await page.evaluate(() => {
        const dateElement = document.querySelector('meta[itemprop="datePublished"]');
        return dateElement ? dateElement.getAttribute('content') : null;
      });
      playlistDetails['تاريخ أول حلقة'] = firstVideoDate;
    }

    // Calculate total duration in seconds
    const totalDurationSeconds = playlistDetails['الفيديوهات']
      .map(video => timeStringToSeconds(video['مدة']))
      .reduce((total, seconds) => total + seconds, 0);
    // Convert total duration back to a time string
    const totalDuration = secondsToTimeString(totalDurationSeconds);
    // Add total duration to the playlist details
    playlistDetails['المدة الإجمالية'] = totalDuration;
    // Close Puppeteer
    await browser.close();
    return playlistDetails;
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    return null;
  }
}

async function updateJsonFile(){
  const filePath = './salasil.json'
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const totalCourses = jsonData.courses.length;
  let currentCourseIndex = 0;

  for(const course of jsonData.courses){
    currentCourseIndex++;
    const playlistId = course['معرف قائمة التشغيل'];
    console.log(`Fetching details for playlist: ${playlistId} (${currentCourseIndex}/${totalCourses})`);

    const playlistDetails = await getAllVideoDetails(playlistId);

    if(playlistDetails){
      course['الفيديوهات'] = playlistDetails['الفيديوهات'];
      course['المدة الإجمالية (بالساعات)'] = playlistDetails['المدة الإجمالية'];
      course['عدد الحلقات'] = playlistDetails['عدد الفيديوهات'];
      course['تاريخ أول حلقة'] = playlistDetails['تاريخ أول حلقة'];
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log('JSON file updated successfully');
}

// Call the update function
updateJsonFile().catch(error => {
  console.error('Error updating JSON file:', error);
});