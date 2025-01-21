DRAFT. To be continued...

matplotlib.pyplot.imread()

matplotlib.image.imread()

cv2.imread()

There is a difference in pixel ordering in OpenCV and Matplotlib. OpenCV follows BGR order, while matplotlib likely follows RGB order.

Therefore, when we display an image loaded in OpenCV using matplotlib functions, we may want to convert it into RGB mode.

```python
# Import some packages from matplotlib
import matplotlib.image as mpimg
import matplotlib.pyplot as plt
# Uncomment the next line for use in a Jupyter notebook
#%matplotlib inline

# Define the filename, read and plot the image
filename = 'sample.jpg'
image = mpimg.imread(filename)
plt.imshow(image)
plt.show()
```

