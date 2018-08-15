---
layout:     post
title:      "A Simple Hand-skin detector for Head Mounted Camera"
subtitle:   ""
date:       2017-04-15 12:00:00
author:     "Wenjin"
header-img: ""
---

Wearable device is believed to be the next-generation  computing platform. As one of those wearable devices, head-mounted device has becoming more and more popular. Google launched its Google glasses several year ago, Microsoft just published their HoloLens AR glasses recently. Unsurprisingly, there will be more companies and entrepreneurs joining the game. 

In a head-mounted device, camera is still the most important input sensor to see the world, although there're other state of the art sensors like LiDAR, IMU. A lot of functions are based on the camera input.

Sometime we may want to capture the hand gesture via the head-mounted camera. Here I use a color threshold in HSV space to implement a simple skin segmentation, which is the first step for further development.

```python
import cv2
import numpy as np

def skin_thresh(img):
    # img = cv2.GaussianBlur(img, (5, 5), 0)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([0, 48, 80]), np.array([20, 255, 255]))
    skin = cv2.bitwise_and(img, img, mask=mask)
    return skin

def main():    
    cap = cv2.VideoCapture(1)
    # Print the width x height
    print cap.get(3), cap.get(4)

    while True:
        ret, frame = cap.read()
        skin = skin_thresh(frame)
        cv2.imshow('Skin threshold...', np.hstack([frame, skin]))

        if cv2.waitKey(1) == 13:
            break
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
```

Have a look at the demo:

<iframe width="560" height="315" src="https://www.youtube.com/embed/gf0XgiNoi5E" frameborder="0" allowfullscreen></iframe>