export const replaceMongoIdInArray = (array) => {
    if (!array || !Array.isArray(array)) {
      return [];
    }
    
    const mappedArray = array
      .filter(item => item && item._id) // Filter out null/undefined items or items without _id
      .map(item => {
        return {
          id: item._id.toString(),
          ...item
        }
      })
      .map(({_id, ...rest}) => rest);

    return mappedArray;
  }

  export const replaceMongoIdInObject = (obj) => {
    if(!obj) return null;

    const {_id, ...updatedObj} = {...obj, id: obj._id.toString()};
   return updatedObj;
  }

  export const getSlug = (title) => {
    if (!title) return null;

    // Robust slugify: lowercase, trim, replace whitespace with '-', 
    // collapse multiple '-', remove non-word chars (except '-')
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')        // Replace whitespace with single dash
      .replace(/[^\w-]+/g, '')     // Remove non-word chars except dash
      .replace(/-+/g, '-')         // Collapse multiple dashes
      .replace(/^-+|-+$/g, '');    // Remove leading/trailing dashes

    return slug;
  }