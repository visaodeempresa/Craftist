import { CraftBlockInsert, CraftTextBlockInsert, CraftTextRun, TextHighlightColor } from "@craftdocs/craft-extension-api";
import { Label, Project, Section, Task, TodoistApi } from "@doist/todoist-api-typescript";
import * as Recoil from "recoil";
import { taskLinkSettingsValues, taskMetadataSettingsValues } from "./settingsUtils";


export const API_TOKEN_KEY = "TODOIST_API_TOKEN";

const globalScopeClient: { current?: TodoistApi } = { current: undefined };

export const apiToken = Recoil.atom({
  key: "todoistApiToken",
  default: "",
});

export const client = Recoil.atom<TodoistApi | undefined>({
  key: "client",
  default: Recoil.selector({
    key: "client:default",
    get: ({ get }) => {
      const token = get(apiToken);
      if (token) {
        globalScopeClient.current = new TodoistApi(token);
        return globalScopeClient.current;
      }
      return undefined;
    },
  }),
  effects_UNSTABLE: [
    ({ onSet }) => {
      onSet((newValue) => {
        globalScopeClient.current = newValue;
      });
    },
  ],
});

export const useLoginCallback = () =>
  Recoil.useRecoilCallback(({ set }) => {
    return async (token: string) => {
      let cli = new TodoistApi(token);
      return cli.getProjects().then(async () => {
        set(apiToken, token);
        set(client, cli);
        await craft.storageApi.put(API_TOKEN_KEY, token);
        //window.localStorage.setItem(API_TOKEN_KEY, token);
      });
    };
  });

export const useLogoutCallback = () =>
  Recoil.useRecoilCallback(({ reset }) => {
    return async () => {
      reset(projects);
      reset(apiToken);
      reset(client);
      await craft.storageApi.delete(API_TOKEN_KEY);
      //window.localStorage.removeItem(API_TOKEN_KEY);
    };
  });

export const useCheckApiTokenConfigured = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async () => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        return false;
      } else {
        return true;
      }
    };
  });
};

export const readStoredApiTokenToVariable = () => {
  return Recoil.useRecoilCallback(({ set }) => {
    return async () => {
      let storedToken = await craft.storageApi.get(API_TOKEN_KEY);
      if (storedToken.status != "error" && storedToken.data != "") {
        // there is a token stored
        set(apiToken, storedToken.data);
      }
    }
  });
}


export const useAddTask = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      projectId?: number;
      content: string;
      description?: string;
      due_date?: string
    }) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const resp = await cli.addTask(params);
      //set(taskFamily(resp.id), resp);
      return resp;
    };
  });
};

export const useCheckIfTaskIsCompleted = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      id: number
    }) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTask(params.id);
      return response.completed
    };

  });
};


export const useCheckIfTaskIsRecurring = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      id: number
    }) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTask(params.id);
      if (response.due?.recurring == true) {
        return true;
      }
      else {
        return false;
      }
    };

  });
};


export const useSetTaskComplete = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      id: number
    }) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.closeTask(params.id);
      return response
    };

  });
};

export const useGetTodaysTasks = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async () => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTasks({ "filter": "today | overdue" });
      return response
    };

  });
};

export const useGetAllTasks = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async () => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTasks({});
      return response
    };

  });
};

export const useGetTasksFromProject = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      projectId: number
    }) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTasks(params);
      return response
    };

  });
};

export const useGetTasksFromFilter = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      filter: string
    }) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTasks(params);
      return response
    };

  });
};


export const useGetProjects = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async () => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getProjects();
      return response
    };

  });
};

export const todoistProjectLinkUrl = "todoist://project?id="
export const todoistTaskLinkMobileUrl = "todoist://task?id="
export const todoistTaskLinkWebUrl = "https://todoist.com/showTask?id="

export const projects = Recoil.atom<Project[]>({
  key: "projects",
  default: Recoil.selector({
    key: "projects:default",
    get: ({ get }) => {
      const cli = get(client);
      if (!cli) return [];
      return cli.getProjects();
    },
  }),
});

export const projectsDict = Recoil.selector({
  key: "projects:dict",
  get: ({ get }) => Object.fromEntries(get(projects).map((p) => [p.id, p])),
});

export const sections = Recoil.atom<Section[]>({
  key: "sections",
  default: Recoil.selector({
    key: "sections:default",
    get: ({ get }) => {
      const cli = get(client);
      if (!cli) return [];
      return cli.getSections();
    },
  }),
});

export const sectionsDict = Recoil.selector({
  key: "sections:dict",
  get: ({ get }) => Object.fromEntries(get(sections).map((p) => [p.id, p])),
});

export const labels = Recoil.atom<Label[]>({
  key: "labels",
  default: Recoil.selector({
    key: "labels:default",
    get: ({ get }) => {
      const cli = get(client);
      if (!cli) return [];
      return cli.getLabels();
    },
  }),
});

export const labelsDict = Recoil.selector({
  key: "labels:dict",
  get: ({ get }) => Object.fromEntries(get(labels).map((p) => [p.id, p])),
});


export type todoistTaskType = Task

// helper functions for nesting

interface NestedTask {
  task: Task;
  //  subtasks: NestedTask[]
  children?: NestedTask[];
}

interface SectionTaskNest {
  section: Section;
  tasks: NestedTask[];
}

interface ProjectSectionTaskNest {
  project: Project;
  sectionTasks?: SectionTaskNest[];
  tasks?: NestedTask[]
}

function getParentTask(nestedTask: NestedTask, parentTaskId: number): NestedTask | undefined {
  if (nestedTask.task.id == parentTaskId) {
    return nestedTask;
  } else if (nestedTask.children != undefined) {
    let result = undefined;
    for (let i = 0; result == undefined && i < nestedTask.children.length; i++) {
      result = getParentTask(nestedTask.children[i], parentTaskId);
    }
    return result;
  }
  return undefined
}


function createBlocksFromNestedTasks(tasks: NestedTask[], indentationLevel: number, sortBy: tasksSortByOptions = tasksSortByOptions.order, labelsList: Label[]) {
  let blocksToAdd: CraftBlockInsert[] = [];


  // switch (sortBy) {
  //   case tasksSortByOptions.order:
  //     tasks.sort((a, b) => ((a.task.order ?? 0) < (b.task.order ?? 0) ? -1 : 1));
  //     break;
  //   case tasksSortByOptions.priority:
  //     tasks.sort((a, b) => ((a.task.priority ?? 0) > (b.task.priority ?? 0) ? -1 : 1));
  //   case tasksSortByOptions.content:
  //     tasks.sort((a, b) => ((a.task.content ?? 0) < (b.task.content ?? 0) ? -1 : 1));
  // }

  //tasks.sort((a, b) => ((a.task.sectionId ?? 0) < (b.task.sectionId ?? 0) ? -1 : 1))



  tasks.forEach(async (curTask) => {

    let tB: CraftTextBlockInsert

    // if (taskBlocksUseClutterFreeView) {
    //   let blockMeta: CraftTextBlockInsert = {
    //     content: getTaskMetadataAsTextRun(curTask.task, labelsList),
    //     type: "textBlock"
    //   }

    //   tB = {
    //     content: createBlockTextRunFromTask(curTask.task, labelsList, false),
    //     type: "textBlock",
    //     listStyle: { type: "todo", state: "unchecked" },
    //     subblocks: [blockMeta]
    //   };
    // } else {
      tB = {
        content: createBlockTextRunFromTask(curTask.task, labelsList, false),
        type: "textBlock",
        listStyle: { type: "todo", state: "unchecked" }
      };
    //}

    tB.indentationLevel = indentationLevel;

    blocksToAdd = blocksToAdd.concat(tB);


    if (curTask.children != undefined) {
      blocksToAdd = blocksToAdd.concat(createBlocksFromNestedTasks(curTask.children, indentationLevel + 1, sortBy, labelsList));
    }

  })

  return blocksToAdd;

}

export enum tasksSortByOptions {
  order,
  priority,
  content
}

export enum taskGroupingOptions {
  projectAndSection,
  projectOnly,
  sectionOnly,
  label,
  none,
  error
}

export function createProjectMdString(project: Project, mdPrefix: string = "+ "): string {
  let mdString = mdPrefix;

  if (taskLinkSettingsValues.includes("web") && taskLinkSettingsValues.includes("mobile")) {
    // both urls requested, need to separate them
    mdString = mdString + "[" + project.name + "](todoist://project?id=" + project.id + ") [(Webview)](" + project.url + ")"
  } else if (!taskLinkSettingsValues.includes("web") && taskLinkSettingsValues.includes("mobile")) {
    // only App Url shall be included, just add it as direct url on the project name
    mdString = mdString + "[" + project.name + "](todoist://project?id=" + project.id + ")";
  } else if (taskLinkSettingsValues.includes("web") && !taskLinkSettingsValues.includes("mobile")) {
    // only Web Url shall be included, just add it as direct url on the project name
    mdString = mdString + "[" + project.name + "](" + project.url + ")";
  } else {
    // no url shall be included just add the name
    mdString = mdString + project.name;
  }
  return mdString;
}

function createSectionMdString(section: Section, mdPrefix: string = "+ "): string {
  let mdString = mdPrefix;

  // section does not have a URL scheme / web link therefore just add the name - could be extended to include the link to the project but this is not that benefitial
  mdString = mdString + section.name;
  return mdString;
}

export function createTaskMdString(task: Task, mdPrefix: string = "- [ ] ", labelsList: Label[]): string {
  let mdString = mdPrefix;

  // cleanup task content (link to craft block should be removed)
  const regex = /\[(.+)\]\(craftdocs:\/\/open\?blockId=([^&]+)\&spaceId=([^\)]+)\)/gm;
  const subst = `$1`;

  // The substituted value will be contained in the result variable
  const strippedTaskContent = task.content.replace(regex, subst);

  if (taskLinkSettingsValues.includes("web") && taskLinkSettingsValues.includes("mobile")) {
    // both urls requested, need to separate them
    mdString = mdString + strippedTaskContent + " [📱](todoist://task?id=" + task.id + ") [🌐](" + task.url + ")";
  } else if (!taskLinkSettingsValues.includes("web") && taskLinkSettingsValues.includes("mobile")) {
    // only App Url shall be included, just add it as direct url on the project name
    mdString = mdString + strippedTaskContent + " [📱](todoist://task?id=" + task.id + ")";
  } else if (taskLinkSettingsValues.includes("web") && !taskLinkSettingsValues.includes("mobile")) {
    // only Web Url shall be included, just add it as direct url on the project name
    mdString = mdString + strippedTaskContent + " [🌐](" + task.url + ")";
  } else {
    // no url shall be included just add the name
    mdString = mdString + strippedTaskContent;
  }
  // metadata import
  mdString = mdString + getTaskMetadataInMarkdownFormat(task, labelsList)

  return mdString;
}

export async function createGroupedBlocksFromFlatTaskArray(projectList: Project[], sectionList: Section[], labelList: Label[], flatTaskArray: Task[], ignoreExistingTasks = false, existingTaskIds: number[] = [], taskGrouping: taskGroupingOptions, sortBy: tasksSortByOptions = tasksSortByOptions.order): Promise<CraftBlockInsert[]> {

  let blocksToAdd: CraftBlockInsert[] = [];

  // // get settings for link usage in task / project Links
  // let useMobileUrls: boolean;
  // let useWebUrls: boolean;
  // let useDueDates: boolean;
  // let useLabels: boolean;
  // let useDescriptions: boolean;
  //
  // let mobileUrlSettings = await getSettingsMobileUrlUsage();
  // let webUrlSettings = await getSettingsWebUrlUsage();
  // let dueDatesSettings = await getSettingsDueDateUsage();
  // let labelsSettings = await getSettingsLabelsUsage();
  // let descriptionSettings = await getSettingsDescriptionUsage();
  //
  // if (mobileUrlSettings == "true" || mobileUrlSettings == "error") {
  //   useMobileUrls = true;
  // } else {
  //   useMobileUrls = false;
  // }
  // if (webUrlSettings == "true" || webUrlSettings == "error") {
  //   useWebUrls = true;
  // } else {
  //   useWebUrls = false;
  // }
  // if (dueDatesSettings == "true" || dueDatesSettings == "error") {
  //   useDueDates = true;
  // } else {
  //   useDueDates = false;
  // }
  // if (labelsSettings == "true" || labelsSettings == "error") {
  //   useLabels = true;
  // } else {
  //   useLabels = false;
  // }
  // if (descriptionSettings == "true" || descriptionSettings == "error") {
  //   useDescriptions = true;
  // } else {
  //   useDescriptions = false;
  // }


  let nestedTasks: NestedTask[] = [];

  let unnestedChildTasks: Task[] = [];

  let projectIds: Set<number> = new Set([]);
  let sectionIds: Set<number> = new Set([]);
  let labelIds: Set<number> = new Set([]);

  // if existing tasks shall be ignored - remove the tasks from the flat array so they don't will be processed
  if (ignoreExistingTasks) {
    flatTaskArray = flatTaskArray.filter(curTask => !existingTaskIds.includes(curTask.id))
  }



  switch (sortBy) {
    case tasksSortByOptions.order:
      flatTaskArray.sort((a, b) => ((a.order ?? 0) < (b.order ?? 0) ? -1 : 1));
      break;
    case tasksSortByOptions.priority:
      flatTaskArray.sort((a, b) => ((a.priority ?? 0) > (b.priority ?? 0) ? -1 : 1));
    case tasksSortByOptions.content:
      flatTaskArray.sort((a, b) => ((a.content ?? 0) < (b.content ?? 0) ? -1 : 1));
  }


  flatTaskArray.map(task => {
    projectIds.add(task.projectId);
    sectionIds.add(task.sectionId);
    task.labelIds.map((labelId) => { labelIds.add(labelId) })
    if (task.parentId == undefined) {
      // task has no parentId and therefore is a parent task
      nestedTasks.push({ task: task });
    } else {
      unnestedChildTasks.push(task);
    }
  })

  let projects: Project[] = []
  let sections: Section[] = []
  let labels: Label[] = []

  Array.from(projectIds.values()).map(projectId => {
    projectList.filter(project => project.id == projectId)
      .map(project => projects.push(project))
  })

  Array.from(sectionIds.values()).map(sectionId => {
    sectionList.filter(section => section.id == sectionId)
      .map(section => sections.push(section))
  })

  Array.from(labelIds.values()).map(labelId => {
    labelList.filter(label => label.id == labelId)
      .map(label => labels.push(label))
  })

  // map all child tasks to their parent tasks
  while (unnestedChildTasks.length > 0) {
    unnestedChildTasks.forEach((curTask, index) => {

      let parentExtists = flatTaskArray.find(task => task.id == curTask.parentId)

      if (parentExtists == undefined) {
        // remove task from unnestedChildTasks since either the parent was found or no parent is existing in the currently imported tasks
        // add it to the nested tasks list since it should be included in the imported tasks in the project section
        nestedTasks.push({ task: curTask })
        unnestedChildTasks.splice(index, 1);
      } else {
        let parentNestedTask: NestedTask | undefined = undefined;
        for (let i = 0; parentNestedTask == undefined && i < nestedTasks.length; i++) {
          if (curTask.parentId) {
            parentNestedTask = getParentTask(nestedTasks[i], curTask.parentId)
          }
        }

        if (parentNestedTask) {
          if (parentNestedTask.children) {
            parentNestedTask.children.push({ task: curTask })
          } else {
            parentNestedTask.children = [{ task: curTask }]
          }
          unnestedChildTasks.splice(index, 1);
        }
      }
    })
  }


  let proSecTaskNest: ProjectSectionTaskNest[] = [];
  let secTaskNest: SectionTaskNest[] = [];

  let tasksToMap = nestedTasks;
  let tasksWithoutSection: NestedTask[] = [];
  tasksToMap.map(curTask => {
    if (curTask.task.sectionId != 0) {
      // section is existing - map to secTaskNest
      let curTasksSection = secTaskNest.find(section => section.section.id == curTask.task.sectionId)
      if (curTasksSection) {
        curTasksSection.tasks.push(curTask);

      } else {
        // section is currently not in the Array
        // search section:
        let curSection = sections.find(searchSection => searchSection.id == curTask.task.sectionId)
        if (curSection) {
          secTaskNest.push({
            section: curSection,
            tasks: [curTask]
          })
        } else {

        }
      }
      // remove this task from the array since it is pushed into the SectionTaskNest
      //tasksToMap.splice(tasksToMap.indexOf(curTask))
    } else {
      tasksWithoutSection.push(curTask);
    }
  })

  // all tasks in a section are removed now from the array, remaining tasks must be mapped to their project

  projects.map(curProject => {
    // find sections for the project
    let proSections = secTaskNest.filter(curSecTaskNest => curSecTaskNest.section.projectId == curProject.id)
    // find tasks for the project without section
    //let proTasks = tasksToMap.filter(curTaskToMap => curTaskToMap.task.projectId == curProject.id)
    let proTasks = tasksWithoutSection.filter(curTaskToMap => curTaskToMap.task.projectId == curProject.id)
    // add sectionTaskNests and tasks to the project-section-task nest
    proSecTaskNest.push({
      project: curProject,
      sectionTasks: proSections,
      tasks: proTasks
    })
  })


  proSecTaskNest.map(curProSecTaskNest => {
    let curBlocksToAdd: CraftBlockInsert[] = [];
    let sectionBlockToAdd: CraftBlockInsert[] = [];
    let blockIndentLevel = 0;

    if (taskGrouping == taskGroupingOptions.projectAndSection || taskGrouping == taskGroupingOptions.projectOnly) {
      // add the project name as foldable block
      // todo add function which creates a markdown link for the project and use here

      curBlocksToAdd = curBlocksToAdd.concat(craft.markdown.markdownToCraftBlocks(createProjectMdString(curProSecTaskNest.project, "+ ")));
    }

    // now we have to add all tasks without a section in that project
    if (curProSecTaskNest.tasks && curProSecTaskNest.tasks.length > 0) {
      if (taskGrouping == taskGroupingOptions.projectAndSection || taskGrouping == taskGroupingOptions.projectOnly) {
        blockIndentLevel = 1;
      }
      curProSecTaskNest.tasks.map(curTask => {
        curBlocksToAdd = curBlocksToAdd.concat(createBlocksFromNestedTasks([curTask], blockIndentLevel, sortBy, labels))
      })
    }
    // now we need to loop through all sections of that project and add the tasks of these sections
    if (curProSecTaskNest.sectionTasks && curProSecTaskNest.sectionTasks.length > 0) {
      // loop through all available sectionTasks Nests.
      curProSecTaskNest.sectionTasks.map(curSecTaskNest => {
        if (taskGrouping == taskGroupingOptions.projectAndSection || taskGrouping == taskGroupingOptions.projectOnly) {
          blockIndentLevel = 1;
        } else {
          blockIndentLevel = 0;
        }
        if (taskGrouping == taskGroupingOptions.projectAndSection || taskGrouping == taskGroupingOptions.sectionOnly) {
          sectionBlockToAdd = craft.markdown.markdownToCraftBlocks(createSectionMdString(curSecTaskNest.section, "+ "));
          sectionBlockToAdd.forEach((block) => {
            // adapt the section indentation level to one higher than the tasks level
            block.indentationLevel = blockIndentLevel;
          })


          curBlocksToAdd = curBlocksToAdd.concat(sectionBlockToAdd);
        }

        // now we have to add the tasks of that section - the check is not necessary but needed for type safety
        if (curSecTaskNest.tasks && curSecTaskNest.tasks.length > 0) {
          if (taskGrouping == taskGroupingOptions.projectAndSection) {
            blockIndentLevel = 2;
          } else if (taskGrouping == taskGroupingOptions.sectionOnly || taskGrouping == taskGroupingOptions.projectOnly) {
            blockIndentLevel = 1;
          }
          curSecTaskNest.tasks.map(curTask => {
            curBlocksToAdd = curBlocksToAdd.concat(createBlocksFromNestedTasks([curTask], blockIndentLevel, sortBy, labels))
          })
        }
      })
    }
    blocksToAdd = blocksToAdd.concat(curBlocksToAdd);
  })
  return blocksToAdd;
}


export const useGetTask = () => {
  return Recoil.useRecoilCallback(({ snapshot }) => {
    return async (params: {
      taskId: number;
    }

    ) => {
      const cli = await snapshot.getPromise(client);
      if (!cli) {
        throw new Error("No client");
      }
      const response = await cli.getTask(params.taskId);
      return response
    };

  });
};

export function getTaskMetadataInMarkdownFormat(task: Task, labelsList: Label[]): string {
  let mdString: string = "";
  if (taskMetadataSettingsValues.length > 0) {
    if (taskMetadataSettingsValues.includes("dueDates")) {
      let dueString = "";
      if (task.due) {
        // task has a due date
        let dueDateYMD = task.due.date.split("-")
        dueString = "[" + dueDateYMD[0] + "." + dueDateYMD[1] + "." + dueDateYMD[2] + "](day://" + dueDateYMD[0] + "." + dueDateYMD[1] + "." + dueDateYMD[2] + ")"

        // check if its a due time
        if (task.due.datetime) {
          // task has an explicit time set
          let dueDate = new Date(task.due.datetime)
          dueString = dueString + " at " + dueDate.toLocaleTimeString();
        }
        mdString = mdString + " " + dueString;

        if (task.due.recurring) {
          mdString = mdString + " *(recurring)*"
        }
      }
    }

    if (taskMetadataSettingsValues.includes("labels")) {
      if (task.labelIds.length > 0) {
        task.labelIds.forEach((labelId) => {
          labelsList.filter((label) => label.id == labelId)
            .map((label) => { mdString = mdString + " ::@" + label.name + "::"; })
        })
      }
    }
    if (taskMetadataSettingsValues.includes("description")) {
      // strip link to document from description:
      const regex = /Craft Document: \[(.+)\]\(craftdocs:\/\/open\?blockId=([^&]+)\&spaceId=([^\)]+)\)/gm;

      const subst = ``;

      // The substituted value will be contained in the result variable
      const strippedDescription = task.description.replace(regex, subst);
      if (strippedDescription.length > 0) {
        mdString = mdString + " description: *" + strippedDescription + "*";
      }
    }
  }

  if (mdString.length > 0) {
    mdString = " // " + mdString;
  }

  return mdString;
}

export function createBlockTextRunFromTask(task: Task, labelsList: Label[], forceUnlinked: boolean = false): CraftTextRun[] {
  let result: CraftTextRun[] = []
  //let testResult: CraftTextRun[] = []

  // cleanup task content (link to craft block should be removed)
  const regex = /\[(.+)\]\(craftdocs:\/\/open\?blockId=([^&]+)\&spaceId=([^\)]+)\)/gm;
  const subst = `$1`;

  // The substituted value will be contained in the result variable
  const strippedTaskContent = task.content.replace(regex, subst);

  let mdBlocks = craft.markdown.markdownToCraftBlocks(strippedTaskContent);
  //
  mdBlocks.forEach((mdBlock) => {
    if (mdBlock.type == "textBlock") {


      if (typeof mdBlock.content == "string") {
        result.push({
          text: mdBlock.content
        })
      } else {
        let textRunContent: CraftTextRun[] = mdBlock.content;
        textRunContent.forEach((textRun) => {
          result.push({
            text: textRun.text,
            highlightColor: textRun.highlightColor,
            isBold: textRun.isBold,
            isCode: textRun.isCode,
            isItalic: textRun.isItalic,
            isStrikethrough: textRun.isStrikethrough,
            link: textRun.link
          })
        })
      }
    }
  })

  if (!forceUnlinked) {
    if (taskLinkSettingsValues.includes("web") && taskLinkSettingsValues.includes("mobile")) {
      // both urls requested, need to separate them
      result.push({
        text: " "
      })
      result.push({
        text: "📱", link: { type: "url", url: "todoist://task?id=" + task.id }
      })
      result.push({
        text: " "
      })
      result.push({
        text: "🌐", link: { type: "url", url: task.url }
      })
    } else if (!taskLinkSettingsValues.includes("web") && taskLinkSettingsValues.includes("mobile")) {
      // only App Url shall be included, just add it as direct url on the task name
      result.push({
        text: " "
      })
      result.push({
        text: "📱", link: { type: "url", url: "todoist://task?id=" + task.id }
      })
    } else if (taskLinkSettingsValues.includes("web") && !taskLinkSettingsValues.includes("mobile")) {
      // only Web Url shall be included, just add it as direct url on the task name
      result.push({
        text: " "
      })
      result.push({
        text: "🌐", link: { type: "url", url: task.url }
      })
    }
  }

  //if (!taskBlocksUseClutterFreeView) {
    result = result.concat(getTaskMetadataAsTextRun(task, labelsList));
  //}

  return result;
}


export function getTaskMetadataAsTextRun(task: Task, labelsList: Label[]): CraftTextRun[] {
  let result: CraftTextRun[] = []
  if (taskMetadataSettingsValues.length > 0) {
    if (taskMetadataSettingsValues.includes("dueDates")) {
      if (task.due) {
        // task has a due date
        result.push({
          text: " "
        })
        result.push(
          {
            text: task.due.date, link:
            {
              type: "dateLink",
              // The date in yyyy-MM-dd format
              date: task.due.date
            }
          }
        )
        // check if its a due time
        if (task.due.datetime) {
          // task has an explicit time set
          let dueDate = new Date(task.due.datetime)
          //remove seconds from time
          const regex = /(\d+:\d+)(:\d+)(.*)/gm;
          const subst = `$1$3`;
          // The substituted value will be contained in the result variable
          const dateString = dueDate.toLocaleTimeString().replace(regex, subst);

          result.push({
            text: " at " + dateString
          })
        }

        if (task.due.recurring) {
          result.push({
            text: " (recurring - " + task.due.string + ")",
            isItalic: true
          })
        }
      }
    }

    if (taskMetadataSettingsValues.includes("priorities")) {
      // check color
      let priorityText = "";
      let highlightColor: undefined | TextHighlightColor = undefined;
      switch (task.priority) {
        case 1: priorityText = "p4"; highlightColor = "grey"; break;
        case 2: priorityText = "p3"; highlightColor = "blue"; break;
        case 3: priorityText = "p2"; highlightColor = "yellow"; break;
        case 4: priorityText = "p1"; highlightColor = "red"; break;
      }
      result.push({
        text: " "
      })
      result.push({
        text: priorityText,
        highlightColor: highlightColor
      })
    }

    if (taskMetadataSettingsValues.includes("labels")) {
      if (task.labelIds.length > 0) {
        task.labelIds.forEach((labelId) => {
          labelsList.filter((label) => label.id == labelId)
            .map((label) => {
              result.push({
                text: " "
              })
              result.push({
                text: "@" + label.name,
                highlightColor: "lime"
              })
            })
        })
      }
    }
    if (taskMetadataSettingsValues.includes("description")) {
      // strip link to document from description:
      const regex = /Craft Document: \[(.+)\]\(craftdocs:\/\/open\?blockId=([^&]+)\&spaceId=([^\)]+)\)/gm;

      const subst = ``;

      // The substituted value will be contained in the result variable
      const strippedDescription = task.description.replace(regex, subst);
      if (strippedDescription.length > 0) {
        result.push({
          text: " description: ",
          isItalic: true
        })
        result.push({
          text: strippedDescription,
          isItalic: true
        })
      }
    }
  }

  if (result.length > 0) {
    result.unshift({
      text: " //",
    })
  }

  return result;
}
